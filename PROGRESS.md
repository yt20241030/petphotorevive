# 进度记录 — 7号 照片修复站 MVP

## 当前状态(2026-07-08)

- **线上网址已跑通:https://petphotorevive.vercel.app**(建站指令第6节步骤1完成)。
- 代码仓库:https://github.com/yt20241030/petphotorevive (main 分支),Vercel 项目已通过 GitHub App 关联该仓库 —— 以后每次 `git push` 到 main 会自动触发 Vercel 重新部署,不需要手动点。
- 品牌定名 PetPhotoRevive 落地(package.json 名字、`src/lib/brand.ts` 配置项、页脚 "by hipopo")。
- 尚未接入 Replicate、Dodo Payments、Cloudflare R2 — 均需创始人提供账号或密钥。

## 已做的决定(附原因)

- 项目目录直接用 `生态总纲/7照片修复/` 作为仓库根目录(不留嵌套子文件夹),与同级 1~6 号项目结构保持一致,各自独立 git 仓库。
- 本项目**不接入**总规则.md 的代币/角色护照体系:建站指令明确这是独立收款 MVP,范围以《照片修复站-MVP-建站指令.md》为准,不自行扩展。
- `npm run dev` 脚本加了 `set NEXT_TELEMETRY_DISABLED=1 &&` 前缀:本机 `AppData\Roaming\nextjs-nodejs` 是跨盘符的重定向目录,Next.js 遥测第一次写配置文件会报 `EXDEV cross-device link` 崩溃,关掉遥测规避,不影响功能。
- GitHub 推送用系统自带 Git Credential Manager 走浏览器 OAuth(founder 自己在浏览器登录/授权),没有走 PAT 明文token,密钥/密码全程不经过对话,符合红线。
- Vercel 项目通过官方 GitHub App 集成(而非 Vercel CLI 直接部署):founder 全程只需在网页上点击授权,不用装 CLI、不用管密钥,后续推代码自动部署。

## 下一步

1. 上传 → Replicate 修复 → 显示修复图(核心效果先跑通,不做支付)。需要创始人提供 `REPLICATE_API_TOKEN`(去 replicate.com 后台获取),我会告诉他具体贴到哪。
2. 之后依次:加水印预览、接 Dodo Checkout + Webhook(测试模式,需要 `DODO_API_KEY`/`DODO_WEBHOOK_SECRET`)、上成本闸、接 Cloudflare + R2。

## 已知的坑

- 本机 Node 全局 npm cache / AppData 目录被重定向到非 C 盘,涉及跨盘 rename 的操作(如 next telemetry 写配置)可能触发 `EXDEV`,遇到时优先用环境变量绕开而不是深挖底层重定向配置。
