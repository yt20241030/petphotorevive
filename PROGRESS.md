# 进度记录 — 7号 照片修复站 MVP

## 当前状态(2026-07-11,线上全链终验通过 ✅)

- **六环节线上终验全部通过**(私有 Blob 存储生效后):①Flux 真引擎修复(engine=flux-restore,智能提示正常)→ ②未付款请求下载被 "Payment required" 挡住(同时证明订单跨实例可见)→ ③demo 付款 200 → ④高清无水印下载 2208x1888(672KB)→ ⑤同一下载链接重放被 403 拦截 → ⑥邮箱收集写入 200。
- **Blob 存储排障全过程(三层问题,依次解决,详见 git log)**:
  1. 生产环境没有凭证变量 → 创始人手动加 `BLOB_READ_WRITE_TOKEN`(Production+Preview,Sensitive);期间加了 `/api/health` 诊断接口(只报配置名,不报值)+ 代码兼容任意 `*_READ_WRITE_TOKEN` 前缀名。
  2. 存储是 **Private 模式**而代码按 public 读写 → 全部改 `access:"private"`,读取弃用 list+公网 fetch 改 `get(pathname,{useCache:false})`——私有模式对付费墙更安全(高清件无公开URL,只能过验签路由),useCache:false 根治覆盖写后读旧值隐患。
  3. Vercel 运行时 sharp 输出的 Buffer 底层可能是 SharedArrayBuffer,SDK 上传拒收 → 上传前复制为普通 ArrayBuffer。
- 教训入档:**"Vercel 后台显示已连接"≠"运行时真的读到了"**,以后接任何存储/密钥类服务,第一步先在 `/api/health` 里验运行时实际状态,再往下走。
- **Replicate 429 归因修正(2026-07-11 创始人查账单后核实)**:7/10 横评期间的批量 429 是 Replicate 低额度档限流(报错原文"less than $5.0 in credit"),与创始人 7/10 的 $10 充值存在时间差;充值到账后档位已解除(终验中 Flux→ESRGAN 背靠背调用一遍过)。**不需要也不要再为此充值**;引擎里的 429 自动重试(12秒×5次)保留作兜底。

## 旧状态(2026-07-10 晚,产品页改版+引擎切换工单完成)

- **主引擎已切换**(创始人拍板):`flux-restore` 二段管线 = `flux-kontext-apps/restore-image`(修复/上色/去损,固定 seed=7 保证同图重跑结果一致)→ `nightmareai/real-esrgan` x2 放大到高清(实测输出 2208x1888),合计约 $0.044/张。本地 E2E 实测 29 秒跑通全链(修复→水印预览→demo付款→高清下载→缓存命中不重复扣费)。
- **备用引擎保留**:`RESTORE_ENGINE=realesrgan` 环境变量可一键切回 Real-ESRGAN(已升级为横评胜出的 x4+锐化 配置),做"仅增强不重绘"档;无 token 时仍退回 sharp-basic。成本闸/水印/验签放行逻辑全部未动。
- **定价 $6 → $9**(`src/lib/brand.ts` PRICE_USD,整数显示,全站同步)。
- **产品页全面改版**:新副标题(free preview / pay only if you love it)、hero 对比滑块换成真实 Flux 修复案例(1900s 明信片长毛猫)、三步流程区+“You only pay if you love the result.”、三组案例(褪色/黑白/破损,全部公有领域老照片+我们自己的 Flux 输出)、"Works best on / Limited results on" 两列适配清单、上传框下加打消顾虑文案、诚实小字("Our AI reconstructs fine details — always preview before you pay.")、定价区($9 含高清/无水印/可保存)。全站无 "100%/perfectly restore" 类承诺、无桌宠字样。手机 375px 宽实测无横向溢出。
- **品牌埋线+邮箱收集**(付费成功态):小字 "hipopo — keeping the bond alive." + 邮箱输入框,`/api/subscribe` 存 Vercel Blob(`emails/<邮箱哈希>.json`,同邮箱重复提交自动覆盖不堆重复)。
- **智能提示(工单第五条)已实现**:`src/lib/photoCheck.ts` 本地启发式(拉普拉斯方差测糊 + 亮度/过曝比例),仅提示不拦截,阈值放保守(老照片颗粒不会误报);上传响应带 `photoFlags`,前端预览页温和提示。

## 旧状态(2026-07-10 上午)

- **等待期建站工单(A-I)已上线,且真引擎(Replicate Real-ESRGAN)已接通并真机验证通过。**
- `REPLICATE_API_TOKEN` 已由创始人贴进 Vercel 环境变量 → 引擎自动从 `sharp-basic` 切到 `replicate-realesrgan`,用创始人提供的一张真实老猫照片实测:上传 → 真实 AI 修复 → 水印预览 → 付款(demo)→ 下载清晰大图 → 链接二次使用返回 403,全链路在线上跑通。
- 首页 hero 示例前后对比图已换成**真实照片**(创始人提供的猫照片当 Before,套真引擎跑出来的水印预览当 After),不再是占位卡通图。
- 存储从"进程内存"改为 **Vercel Blob**(`src/lib/jobStore.ts` 按 `BLOB_READ_WRITE_TOKEN` 是否存在自动切换后端):创始人已在 Vercel Storage 建了 Blob 数据库并连接项目、重新部署。
- 落地页(`src/app/page.tsx`)是真正的产品页:hero + 示例前后对比滑块 + 上传控件 + 水印预览 + 定价下载按钮 + 页脚 "by hipopo",桌面/手机都测过。
- 完整流水线:上传校验(类型/大小)→ 修复(双引擎自动切换)→ 水印+降分辨率预览(`src/lib/watermark.ts`)→ 内容 hash 去重缓存 → 付款门(demo 模式,`DODO_API_KEY` 一贴自动切真 Dodo)→ 一次性/15分钟短时效下载链接。
- 成本闸(三层,互不替代):①IP 每日限 5 次免费预览(`src/lib/rateLimit.ts`,进程内存态,见"已知的坑");②同一张图内容 hash 命中直接复用结果不重新跑引擎;③**全站每日修图总闸**(`src/lib/dailyCap.ts`,默认 500 次/天,环境变量 `DAILY_RESTORE_LIMIT` 可调):按 UTC 日期计数,存 Vercel Blob(键随日期滚动,零点自动"清零",无需清理任务),**在调用 Replicate 之前检查**,超限一律 503 拦截("Our studio is at capacity today"),一分钱不多花;成功调用后才 +1;缓存命中不消耗额度。已本地验证:限 2 次时第 3 张新图被拦、重复图仍正常返回。
- Dodo webhook 路由先占位:没有 `DODO_WEBHOOK_SECRET` 时直接拒绝一切请求,不会被伪造请求放行下载。
- 本地 `npx next build` + `npx eslint .` + `npx tsc --noEmit` 全绿。

## 真机测试踩的坑(按时间顺序,供以后排障参考)

1. **付款后下载 403**:Vercel 把每个 API 路由部署成独立的无状态函数,互相不共享进程内存,原来的内存态 `jobStore` 在 `/api/restore` 和 `/api/download` 之间对不上。→ 改用 Vercel Blob 持久化(见上)。
2. **真引擎 500,`Invalid version`**:`replicateRealesrgan.ts` 里凭记忆写死的模型 version hash 已失效。→ 改用不锁版本号的 `nightmareai/real-esrgan`(不带 `:hash`),由 Replicate 服务端解析到当前最新版本,以后也不会再因为版本号过期而炸。
3. **大图水印合成 500,`must have same dimensions or smaller`**:`watermark.ts` 里 sharp 管线 resize 排队后调用 `.metadata()` 拿到的不是resize后的真实尺寸(小图碰巧没发现,真实 1080x1398 的照片一测就炸)。→ 改用 `toBuffer({resolveWithObject:true})` 先拿到resize后的真实 `info.width/height` 再画水印。

这三个坑印证了同一条经验:**只在本地小测试图上验证是不够的,必须用真机+真实尺寸照片走一遍线上环境。**

## 已做的决定(附原因)

- 项目目录直接用 `生态总纲/7照片修复/` 作为仓库根目录,与同级 1~6 号项目结构保持一致,各自独立 git 仓库。
- 本项目**不接入**总规则.md 的代币/角色护照体系,范围以两份建站指令文档为准,不自行扩展。
- `npm run dev` 脚本加了 `set NEXT_TELEMETRY_DISABLED=1 &&` 前缀,规避本机 AppData 跨盘符导致的 Next.js 遥测写配置崩溃。
- GitHub 推送、Vercel 项目关联都走浏览器 OAuth/官方 GitHub App,密钥/密码全程不经过对话。
- **付款门用"demo 模式"而非假绕过**:`/api/checkout` 只在完全没配置 `DODO_API_KEY` 时才在服务端把 job 标记为已付款;一旦配置了 `DODO_API_KEY`,demo 分支自动失效,走真实 Dodo 逻辑(目前显式报错占位,不会误放行)。
- **下载令牌是服务端状态化的一次性随机串**,存在 job store 里(Blob 或内存,取决于后端),不用额外的 HMAC 密钥管理。
- **Replicate 调用不锁定版本号**(`nightmareai/real-esrgan`,不带 `:hash`):避免版本号过期这一类问题重演,由 Replicate 解析到最新版本。
- **示例前后对比图用创始人提供的真实照片**,不是网上找的"免版权"素材:创始人本人拥有这张照片的权利,比去网上淘素材更没有版权风险;After 是这张照片经真引擎修复后的水印预览,是真实效果而非摆拍。

## 模型横评结论(2026-07-10,详见 测试对比/ 本地文件夹)

- **低清照片超分横评**(白猫/公有领域狗猫):Real-ESRGAN x4+锐化 ≈ Topaz LowRes V2+4x > Swin2SR(生产不可用,>800px 输入显存爆)> Real-ESRGAN x2(现行,太保守)> Recraft(磨皮)。结论:现行引擎该升级到 x4+锐化,等创始人拍板。
- **破损/褪色老照片修复横评**(4张1900-1910公有领域老照片,Flux Restore 双种子 vs ESRGAN x4+锐化 vs Topaz):
  - Flux Restore(flux-kontext-apps/restore-image,~$0.04/张):唯一能去污渍/去泛黄/自动上色/修破损的,观感惊艳;但**实锤会编造**——同图换种子,输出明显不同(old4 种子1把猫眼睛改成绿色、删掉明信片边框文字,种子2却保留;old3 两种子在原图暗影处各自编出不同物体;old2 种子1连桌子雕花和构图都重画了)。**无保真度参数可压制**(schema 只有 seed/output_format/safety_tolerance)。输出被压到约1MP,若采用需 Flux→ESRGAN 二段管线放大到高清。
  - ESRGAN x4+锐化(~$0.004)与 Topaz(~$0.05):像素级忠实、绝不改宠物样貌,但对污渍/泛黄/破损无能为力,修完还是"更清楚的旧照片"。
  - 本质取舍:"翻新但会撒谎"(Flux)vs"诚实但不惊艳"(超分)。对悼念宠物客群,照片是遗物,样貌被改是雷区;但老照片的"病"只有 Flux 治得了。主引擎选型待创始人拍板。

## 下一步

1. 等创始人和项目经理对齐,拿到 Dodo test key 后:①把 `/api/checkout` 里的 `createDodoCheckoutSession` 按官方文档实现;②把 `/api/webhooks/dodo` 的签名验证实现好。
2. 后续:接 Cloudflare + R2(把图片流量从 Vercel Blob 挪到 R2 省流量费;`jobStore.ts` 已经是"按 token 是否存在自动切换后端"的写法,加 R2 分支不用碰 API 路由代码)。
3. `rateLimit.ts`(每日免费次数限制)目前仍是进程内存态,同样有"冷启动/多实例查不到"的问题,但后果只是限流偶尔失效(不是安全洞),先不处理;真上量了再挪到 Blob/KV。

## 已知的坑

- 本机 Node 全局 npm cache / AppData 目录被重定向到非 C 盘,涉及跨盘 rename 的操作可能触发 `EXDEV`,遇到时优先用环境变量绕开。
- `rateLimit.ts` 的每日免费次数计数器是进程内存态,冷启动会重置,不是安全问题(不影响付费下载的正确性),只影响"防刷"精确度,后续可挪到 Blob/KV。
- `dailyCap.ts` 的 Blob 计数是"读了再写",不是原子操作:两个请求同时踩线时可能各自读到 499 双双放行,最坏超出上限几次调用——对花费闸来说可接受,已写在代码注释里;若要求严格原子需换 Vercel KV/Redis 的 INCR。
