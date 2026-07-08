# 7号 照片修复站 MVP

> 独立收款站,不属于桌宠生态的代币/角色护照体系。唯一目标:7 天内上线收到第一笔钱。
> 新会话先读:本文件 → [照片修复站-MVP-建站指令.md](照片修复站-MVP-建站指令.md)(完整需求)→ [PROGRESS.md](PROGRESS.md)(当前进度)→ `git log --oneline -20`。

## 项目是什么

上传老宠物照片 → Replicate Real-ESRGAN 修复清晰 → 带水印预览 → Dodo Payments 付费 → 下载高清无水印。详见建站指令文档,不要偏离其范围(不做 App/用户系统/上色/划痕修复等)。

## 技术栈

Next.js(App Router)+ TypeScript + Tailwind,部署 Vercel,图片存储 Cloudflare R2(后期接入),支付 Dodo Payments,修复模型 Replicate `nightmareai/real-esrgan`(`face_enhance=false`)。

## 怎么启动

`npm install`(首次)→ `npm run dev` → http://localhost:3000
