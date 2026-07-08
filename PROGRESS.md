# 进度记录 — 7号 照片修复站 MVP

## 当前状态(2026-07-08)

- 已用 `create-next-app` 脚手架搭起 Next.js(TS + Tailwind + App Router)项目,本地 `npm run dev` 跑通,首页显示占位文案确认链路正常。
- 尚未 git 初始化 / 尚未连 GitHub / 尚未部署 Vercel。
- 尚未接入 Replicate、Dodo Payments、Cloudflare R2 — 均需创始人提供账号或密钥。

## 已做的决定(附原因)

- 项目目录直接用 `生态总纲/7照片修复/` 作为仓库根目录(不留嵌套子文件夹),与同级 1~6 号项目结构保持一致,各自独立 git 仓库。
- 本项目**不接入**总规则.md 的代币/角色护照体系:建站指令明确这是独立收款 MVP,范围以《照片修复站-MVP-建站指令.md》为准,不自行扩展。
- `npm run dev` 脚本加了 `set NEXT_TELEMETRY_DISABLED=1 &&` 前缀:本机 `AppData\Roaming\nextjs-nodejs` 是跨盘符的重定向目录,Next.js 遥测第一次写配置文件会报 `EXDEV cross-device link` 崩溃,关掉遥测规避,不影响功能。

## 下一步

1. 按建站指令第 6 节顺序推进:git init → GitHub 仓库 → Vercel 部署,拿到第一个线上网址。
2. 之后需要创始人提供:GitHub 账号(或让我用 Vercel CLI 直接部署跳过 GitHub)、Vercel 账号登录、Replicate API Token、Dodo Payments Test Key。
3. 上传 → Replicate 修复 → 显示修复图(核心效果先跑通,不做支付)。

## 已知的坑

- 本机 Node 全局 npm cache / AppData 目录被重定向到非 C 盘,涉及跨盘 rename 的操作(如 next telemetry 写配置)可能触发 `EXDEV`,遇到时优先用环境变量绕开而不是深挖底层重定向配置。
