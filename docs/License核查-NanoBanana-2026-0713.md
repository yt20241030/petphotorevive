# Nano Banana 商用授权核查(2026-07-13,创始人工单第一项)

## 一、调用渠道(准确身份)

- **模型准确名称**:Google **Gemini 2.5 Flash Image**(官方代号 "nano-banana"),Google DeepMind 出品的**正式版(GA)**图像生成/编辑模型——不是预览版。
- **调用渠道**:Replicate 平台官方托管的 `google/nano-banana`(Google 官方入驻模型,非社区搬运),计费走 Replicate 账户,累计调用量 1.13 亿次。
- 生成链:`google/nano-banana` → `nightmareai/real-esrgan`(BSD,已核查)放大。

## 二、条款依据(原文链接 + 关键结论)

1. **Replicate 服务条款** https://replicate.com/terms
   - §5.1:**输出物的一切权利归客户所有**,原文明确含 "your use of Output for commercial purposes such as sale or publication"(允许商业销售/发表),前提是遵守适用的第三方模型条款。
   - 其"附加条款"对 Flux/Stability/Ideogram 等列了专门限制,**未对 Google 模型设额外限制**;适用的第三方条款即 Google 的 Gemini API 条款。
2. **Google Gemini API 条款** https://ai.google.dev/gemini-api/terms
   - **Google 不主张生成内容的所有权**("Google won't claim ownership over that content");
   - **未禁止商业使用**;用户对生成内容的使用自担责任;
   - 禁止性条款:不得用于开发竞品模型、逆向工程、绕过安全机制、无监管医疗用途,并须遵守 Prohibited Use Policy(违法内容等)——与我们业务无冲突;
   - 注意:Google 的许可**不覆盖第三方权利**(商标、真人肖像等)——我们已有对应实践(superhero 风格因商标风险下架)。
3. **需要辨析的一条**(检索中发现):Google Cloud 的 **Generative AI Preview(预览版)产品**条款禁止商用——**该条只适用 Pre-GA 预览版**;我们用的 Gemini 2.5 Flash Image 是 GA 正式版、经 Replicate 官方渠道,不在其列。(同理:若未来想升级 nano-banana-pro/Gemini 3 Pro Image,需届时重查其 GA 状态。)
4. 参考检索:[Google 官方社区关于 nano-banana 商用的答复](https://support.google.com/gemini/thread/370190690)、[Replicate nano-banana-pro 页](https://replicate.com/google/nano-banana-pro)。

## 三、专项确认

- **生成图像可否商业销售?** ✅ 可以(Replicate §5.1 明文 + Google 不主张所有权且未禁商用)。
- **输出物版权归属?** 归我们(客户)所有;Google 保留为他人生成相似内容的权利(生成式模型通例,非独占)。
- **禁止性用途?** 违法内容/竞品训练/绕过安全等,与本业务无关;第三方商标与真人肖像权不豁免(已有下架实践)。
- **附带事实**:输出内嵌 Google SynthID 不可见水印(标识 AI 生成),不影响商用权利,反而利于合规透明。
- **北美生产环境稳定性**:Replicate 为美国平台,该模型平台累计 1.13 亿次调用;我们已实测约 40 次(含线上生产 2 单)全部成功;已知运营注意项仅为"账户余额 <$5 触发限速"(充值即解)。

## 四、结论(判断)

**✅ 通过——nano-banana 经 Replicate 官方渠道可商用,输出可销售,无需回滚 Flux Kontext。** 收款前置的 License 闭环完成。

复查触发条件:①更换调用渠道(如脱离 Replicate 直连 Gemini API)②升级到 pro/新版本 ③Google 条款重大变更。
