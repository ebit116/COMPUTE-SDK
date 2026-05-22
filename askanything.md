这个实例包含哪些配置，上传的视频仍然在本地吗？


很好的问题！我来为你详细解释一下，这样你会豁然开朗 💡

## 🤔 你租的不仅仅是显卡！

你理解有误。**COMPUTE GPU 租赁的是一个完整的云计算实例（云服务器），不仅仅是显卡**。

看看你搜索 GPU 时返回的配置信息：

```typescript
interface GpuOffer {
  gpu_name: string;        // ← 显卡型号
  gpu_ram: number;         // ← 显卡显存
  
  num_gpus: number;        // ← 有多少张显卡
  cpu_cores: number;       // ← CPU 核心数 ⭐️
  cpu_ram: number;         // ← 内存容量（RAM）⭐️
  disk_space: number;      // ← 硬盘空间 ⭐️
  
  inet_down: number;       // ← 下载网速
  inet_up: number;         // ← 上传网速
}
```

---

## 📦 实例包含的完整配置

```
┌─────────────────────────────────────────┐
│     COMPUTE GPU 实例（完整主机）         │
├─────────────────────────────────────────┤
│ ✓ GPU（显卡）      - RTX 4090 等       │
│ ✓ CPU              - 8核/16核/32核     │
│ ✓ RAM              - 64GB/128GB/256GB  │
│ ✓ SSD 磁盘        - 32GB/64GB/256GB   │
│ ✓ 操作系统        - Ubuntu Linux      │
│ ✓ 网络连接        - 公网 IP + SSH    │
│ ✓ Docker 环境      - 可选             │
│ ✓ CUDA 工具集      - 预装             │
└─────────────────────────────────────────┘
```

---

## 🎯 数据流工作原理

### **场景：你上传一个 2GB 的视频用于 AI 处理**

```
                你的本地电脑
                    ↓
    [视频文件 2GB]
                    ↓
        通过 SCP/SSH 上传
                    ↓
         COMPUTE GPU 实例
        （远程云服务器）
                    ↓
    ┌──────────────────────┐
    │  /workspace/video.mp4│  ← 视频存储在
    │    (SSD 磁盘上)      │     云服务器的
    │  GPU 处理视频        │     硬盘里
    │  输出: output.mp4    │
    └──────────────────────┘
                    ↓
    通过 SCP/SSH 下载
                    ↓
    你的本地电脑
    [处理好的视频]
```

---

## 📍 文件位置详解

```bash
# 上传视频到远程实例
scp -P 12345 my_video.mp4 root@123.45.67.89:/workspace/

# 此时视频在：远程服务器的 /workspace/ 目录
# 物理位置：实例的 SSD 硬盘上

# GPU 在实例上处理这个视频
ssh -p 12345 root@123.45.67.89
cd /workspace/
python animate.py  # 使用 GPU 处理

# 处理完后，下载回本地
scp -P 12345 -r root@123.45.67.89:/workspace/output/ ./

# 现在输出在：你本地电脑上
```

---

## ⚙️ 租赁配置详解

你在租赁时可以指定这些参数：

```typescript
const result = await compute.rent(gpuOfferId, {
  image: 'pytorch:latest',           // 预装 PyTorch 的 Docker 镜像
  disk: 64,                          // 分配 64GB 硬盘（默认32GB）
  onstart: 'pip install diffusers'   // 启动时自动执行命令
});
```

| 参数 | 含义 | 例子 |
|------|------|------|
| `image` | 预装的操作系统/环境 | `pytorch:latest`, `tensorflow:latest` |
| `disk` | 硬盘空间（单位GB） | 64 = 64GB 硬盘 |
| `onstart` | 启动时执行的命令 | `pip install torch diffusers` |

---

## 💾 存储成本说明

```
┌─────────────────┬──────────────┐
│  存储位置       │  计费方式    │
├─────────────────┼──────────────┤
│ 本地电脑        │ 不计费       │
│ 云实例硬盘      │ 按小时计费   │ ← 正在租赁时
│ （租赁期间）    │              │
└─────────────────┴──────────────┘
```

**重点**：只要实例还在运行，就要付钱。一旦 `terminate()` 了，实例会被删除，里面的所有数据也会丢失！

---

## ✅ 实际工作流程示例

```bash
### 第1步：连接到实例
ssh -p 12345 root@123.45.67.89

### 第2步：查看磁盘空间
df -h
# 输出：/dev/sda1  64G  2G  62G  4%  /

### 第3步：创建工作目录
mkdir -p /workspace/animations

### 第4步：从本地上传视频（本地终端执行）
scp -P 12345 my_video.mp4 root@123.45.67.89:/workspace/animations/

### 第5步：检查文件是否上传成功（实例终端执行）
ls -lh /workspace/animations/
# 输出：-rw-r--r--  1 root root  2.0G  May 22 10:30 my_video.mp4

### 第6步：运行 AI 动画处理
python my_animation_script.py

### 第7步：下载结果（本地终端执行）
scp -P 12345 root@123.45.67.89:/workspace/animations/output.mp4 ./

### 第8步：查看本地文件
ls -lh output.mp4
# 输出：-rw-r--r--  1 user  staff  3.5G  May 22 10:45 output.mp4
```

---

## 🎓 总结：你实际租赁的是什么

| 项目 | 说明 |
|------|------|
| **GPU** | 用来加速 AI 动画渲染 |
| **CPU** | 用来运行 Python 脚本、处理逻辑 |
| **RAM** | 缓存数据、加速计算 |
| **硬盘** | 存储你上传的视频、输出结果、模型文件等 |
| **网络** | 连接到你的本地电脑，上传/下载文件 |
| **系统** | Ubuntu Linux + CUDA 工具集 |

**你上传的视频会临时存储在云实例的硬盘上，处理完后需要下载回本地。一旦终止实例，所有数据都会被删除。**

有其他疑问吗？😊
