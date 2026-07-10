# 7号 照片修复站 MVP

> 独立收款站,不属于桌宠生态的代币/角色护照体系。唯一目标:7 天内上线收到第一笔钱。
> 新会话先读:本文件 → [照片修复站-MVP-建站指令.md](照片修复站-MVP-建站指令.md)(完整需求)→ [PROGRESS.md](PROGRESS.md)(当前进度)→ `git log --oneline -20`。

## 项目是什么

上传老宠物照片 → Replicate Real-ESRGAN 修复清晰 → 带水印预览 → Dodo Payments 付费 → 下载高清无水印。详见建站指令文档,不要偏离其范围(不做 App/用户系统/上色/划痕修复等)。

## 技术栈

Next.js(App Router)+ TypeScript + Tailwind,部署 Vercel,图片/订单状态存 Vercel Blob(Cloudflare R2 后期接入),支付 Dodo Payments。修复引擎(2026-07-10 创始人拍板):主引擎 `flux-kontext-apps/restore-image` + `nightmareai/real-esrgan` x2 放大(合计约$0.044/张);备用 Real-ESRGAN x4+锐化(`RESTORE_ENGINE=realesrgan` 切换,仅增强不重绘);`face_enhance` 永远 false(GFPGAN 非商用依赖)。

## 怎么启动

`npm install`(首次)→ `npm run dev` → http://localhost:3000
