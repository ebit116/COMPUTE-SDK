根据 COMPUTE-SDK 的文档，我为你整理了**用 AI 制作动画后租赁 GPU 的完整步骤**：

## 🎬 AI 动画制作 + GPU 租赁完整指南

### **第一步：准备工作**
1. **注册 COMPUTE GPU 账户**
   - 访问 [computegpu.com](https://computegpu.com)
   - 注册账户并获得 **API Key**
   
2. **准备 SSH 密钥**
   ```bash
   ssh-keygen -t ed25519
   ```
   - 获得 `~/.ssh/id_ed25519.pub` 中的公钥

3. **安装 SDK**（推荐方式）
   ```bash
   npm install @computegpu/sdk
   ```

---

### **第二步：搜索和选择合适的 GPU**
```typescript
import { ComputeGPU } from '@computegpu/sdk';

const compute = new ComputeGPU({
  apiKey: 'your-api-key',
});

// 搜索可用 GPU
const gpus = await compute.searchGPUs({
  minVram: 24000,      // 最小24GB显存（推荐用于 AI 动画）
  maxPrice: 1.0,       // 最多 1$/小时
  limit: 10            // 返回前10个结果
});

console.log(gpus);
```

**关键参数说明：**
- `minVram`: 显存大小（MB）- 动画制作推荐 24GB+
- `gpuName`: 具体型号（如 "RTX 4090"）
- `maxPrice`: 最高价格（$/小时）
- `region`: 地理位置

---

### **第三步：租赁 GPU 实例**
```typescript
// 选择第一个 GPU 并租赁
const gpus = await compute.searchGPUs({ minVram: 24000, limit: 1 });
const result = await compute.rent(gpus[0].id, {
  disk: 64,  // 分配 64GB 磁盘空间
  onstart: 'pip install torch transformers diffusers',  // 启动时安装依赖
});

console.log(`Instance ID: ${result.instanceId}`);
```

---

### **第四步：设置 SSH 密钥（推荐）**
```typescript
// 上传你的 SSH 公钥
await compute.setSSHKey('ssh-ed25519 AAAAC3NzaC1...');
```

---

### **第五步：等待实例就绪**
```typescript
let instance;
do {
  await new Promise(r => setTimeout(r, 5000));  // 每5秒检查一次
  instance = await compute.getInstance(result.instanceId);
  console.log(`Status: ${instance.actual_status}`);
} while (instance.actual_status !== 'running');

console.log(`🎉 就绪! SSH: ssh -p ${instance.ssh_port} root@${instance.ssh_host}`);
```

---

### **第六步：连接并上传你的 AI 动画代码**
```bash
# SSH 连接到实例
ssh -p <ssh_port> root@<ssh_host>

# 上传文件
scp -P <ssh_port> your_animation_script.py root@<ssh_host>:/workspace/
```

---

### **第七步：运行 AI 动画生成任务**
```bash
# 在实例上运行
python /workspace/your_animation_script.py

# 常见 AI 动画工具：
# - Stable Diffusion + AnimateDiff
# - Deforum Stable Diffusion
# - DALL-E API
# - Runway Gen-2
# - Leonardo.AI
```

---

### **第八步：下载结果**
```bash
# 从实例下载生成的动画
scp -r -P <ssh_port> root@<ssh_host>:/workspace/output/ ./animations/
```

---

### **第九步：终止实例（重要！停止计费）**
```typescript
await compute.terminate(result.instanceId);
console.log('✅ 实例已终止，停止计费');
```

---

## 💡 快速参考代码

```typescript
import { ComputeGPU } from '@computegpu/sdk';

const compute = new ComputeGPU({ apiKey: process.env.COMPUTE_API_KEY });

async function rentGPUForAnimation() {
  // 1. 搜索 GPU
  const gpus = await compute.searchGPUs({ minVram: 24000, limit: 1 });
  
  // 2. 租赁
  const { instanceId } = await compute.rent(gpus[0].id, {
    disk: 64,
    onstart: 'pip install torch diffusers'
  });
  
  // 3. 等待就绪
  let instance;
  do {
    await new Promise(r => setTimeout(r, 5000));
    instance = await compute.getInstance(instanceId);
  } while (instance.actual_status !== 'running');
  
  console.log(`✅ SSH: ssh -p ${instance.ssh_port} root@${instance.ssh_host}`);
  
  // 任务完成后...
  // await compute.terminate(instanceId);
}

rentGPUForAnimation();
```

---

## 📝 额外提示
- **成本估算**：RTX 4090 约 $0.8-2/小时
- **首购奖励**：新用户首次购买后24小时内获得 10,000 $COMPUTEGPU 代币
- **支付方式**：Solana（SOL）或账户余额
- **存储**：使用 `/workspace/` 目录存放代码和输出文件

有任何具体问题，欢迎继续提问！🚀
