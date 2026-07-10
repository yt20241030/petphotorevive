# 进度记录 — 7号 照片修复站 MVP

## 当前状态(2026-07-10)

- **等待期建站工单(A-I 全部任务)已完成并本地验证通过,待推送上线。**
- 落地页(`src/app/page.tsx`)是真正的产品页:hero + 示例前后对比滑块 + 上传控件 + 水印预览 + 定价下载按钮 + 页脚 "by hipopo",桌面/手机都测过。
- 双引擎抽象(`src/lib/engine/`):`sharp-basic`(无需密钥,现在用这个)、`replicate-realesrgan`(真引擎,已写好调用代码,检测到 `REPLICATE_API_TOKEN` 自动切换,不用改代码)。
- 完整流水线:上传校验(类型/大小)→ 修复 → 水印+降分辨率预览(`src/lib/watermark.ts`)→ 内容 hash 去重缓存 → 付款门(demo 模式,`DODO_API_KEY` 一贴自动切真 Dodo,现在这条分支会显式报错提醒去接文档,不会悄悄放行)→ 一次性/15分钟短时效下载链接(`src/lib/jobStore.ts` 的 `issueDownloadToken`/`consumeDownloadToken`,已用 curl 验证:第二次用同一链接返回 403)。
- 成本闸:IP 每日限 5 次免费预览(`src/lib/rateLimit.ts`,可调 `FREE_PREVIEWS_PER_DAY`)、同一张图内容 hash 命中直接复用结果不重新跑引擎。
- Dodo webhook 路由(`src/app/api/webhooks/dodo/route.ts`)先占位:没有 `DODO_WEBHOOK_SECRET` 时直接拒绝一切请求,绝不会被伪造请求放行下载——真正验签逻辑等拿到 key 再对着官方文档写。
- 本地 `npx next build` + `npx eslint .` 全绿;`npx tsc --noEmit` 无报错。

## 已做的决定(附原因)

- 项目目录直接用 `生态总纲/7照片修复/` 作为仓库根目录(不留嵌套子文件夹),与同级 1~6 号项目结构保持一致,各自独立 git 仓库。
- 本项目**不接入**总规则.md 的代币/角色护照体系:建站指令明确这是独立收款 MVP,范围以《照片修复站-MVP-建站指令.md》为准,不自行扩展。
- `npm run dev` 脚本加了 `set NEXT_TELEMETRY_DISABLED=1 &&` 前缀:本机 `AppData\Roaming\nextjs-nodejs` 是跨盘符的重定向目录,Next.js 遥测第一次写配置文件会报 `EXDEV cross-device link` 崩溃,关掉遥测规避,不影响功能。
- GitHub 推送用系统自带 Git Credential Manager 走浏览器 OAuth(founder 自己在浏览器登录/授权),没有走 PAT 明文token,密钥/密码全程不经过对话,符合红线。
- Vercel 项目通过官方 GitHub App 集成(而非 Vercel CLI 直接部署):founder 全程只需在网页上点击授权,不用装 CLI、不用管密钥,后续推代码自动部署。
- **付款门用"demo 模式"而非假绕过**:`/api/checkout` 只在完全没配置 `DODO_API_KEY` 时才在服务端把 job 标记为已付款(因为没接 Dodo,这个阶段本来就收不了真钱,不存在"被白嫖真钱"的风险);一旦配置了 `DODO_API_KEY`,这条 demo 分支自动失效,走真实 Dodo 逻辑(目前是显式报错占位,提醒去接官方文档,不会误放行)。
- **下载令牌是服务端状态化的一次性随机串**(存在 `jobStore` 里,不是无状态签名),原因:反正已经有内存态的 job store,状态化实现更简单、单次使用更好验证,不需要额外引入 HMAC 密钥管理。
- **示例前后对比图是自制的占位图**(`scripts/generate-demo.mjs` 生成,一个简单卡通脸,套 `sharp-basic` 引擎跑一遍),不是真实宠物照片:手头没有可商用的老宠物照片素材,自制图避免版权问题;真实素材/真实 Real-ESRGAN 效果图等 token 到位后再换。
- **数据存储现状是进程内存(in-memory Map)**,不是数据库/R2:等待期工单没要求接存储层,先用最简单方式把流程跑通;明确写在代码注释和这里——单个 Vercel 实例内没问题,但冷启动或多实例并发时可能查不到之前的 job(概率不高,不影响现在的演示/测试用途),等真正接 Cloudflare+R2 那一步再换成持久存储,届时只需替换 `jobStore.ts` 内部实现,不用动 API 路由的调用方式。

## 下一步

1. **推送这批代码上线**(下面立刻做),然后在 `petphotorevive.vercel.app` 上真机走一遍:上传照片→看到水印预览→点下载→拿到清晰大图。
2. 等创始人和项目经理对齐后,拿到 `REPLICATE_API_TOKEN` 贴进 Vercel 环境变量,自动切换成真 AI 修复,不用改代码。
3. 拿到 Dodo test key 后:①把 `/api/checkout` 里的 `createDodoCheckoutSession` 按官方文档实现;②把 `/api/webhooks/dodo` 的签名验证实现好。
4. 后续:接 Cloudflare + R2(把内存态 job store 换成持久存储)。

## 已知的坑

- 本机 Node 全局 npm cache / AppData 目录被重定向到非 C 盘,涉及跨盘 rename 的操作(如 next telemetry 写配置)可能触发 `EXDEV`,遇到时优先用环境变量绕开而不是深挖底层重定向配置。
- job / 下载令牌 / 限流计数器都是进程内存态,见上面"已做的决定"最后一条,冷启动会丢——测试时如果偶尔出现"job not found"属已知限制,重新上传一次即可,不是 bug。
