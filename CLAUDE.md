# 7号 宠物艺术肖像工作室(原照片修复站,2026-07-11 转向)

> 独立收款站,不属于桌宠生态的代币/角色护照体系。
> 新会话先读:本文件 → [PROGRESS.md](PROGRESS.md)(当前进度)→ `git log --oneline -20`。产品逻辑源自 1号美图(12风格宠物肖像),引擎按 License 红线换成 Replicate/Flux Kontext。

## 项目是什么

上传宠物照片 → 安全闸门(检测不到清晰宠物脸=拒绝生成,"We never guess")→ 选 12 风格之一 → Flux Kontext 生成 → 免费 3 次 512px 水印预览 → 积分解锁高清($2.99/5、$4.99/20、$9.99/50,1积分=1张高清)。

## 红线

- 引擎只用 Replicate 可商用模型(Flux Kontext Pro / Real-ESRGAN face_enhance=false / Grounding DINO);严禁豆包等无商用授权引擎。
- 全站禁出现桌宠/3D模型/AI视频/宠物歌曲/游戏等未来产品字样或"敬请期待"。
- 风格显示名与产出不得含受商标保护的角色/标志(superhero 提示词已封死 logo)。
- 诚实文案:"We recreate from what we can see. We never guess."

## 技术栈

Next.js(App Router)+ TypeScript + Tailwind,Vercel 部署,Vercel Blob 私有存储(订单/用户积分/邮箱),Dodo Payments(待接入,期间 demo 加分)。生成链:Grounding DINO 面部闸门(~$0.002)→ flux-kontext-pro(~$0.04)→ real-esrgan x2(~$0.004)。

## 怎么启动

`npm install`(首次)→ `npm run dev` → http://localhost:3000
