# COMPUTE GPU SDK

A TypeScript/JavaScript SDK for renting GPUs and managing compute instances programmatically.

## Installation

```bash
npm install @computegpu/sdk
```

Or use directly via the API endpoints.

## Quick Start

```typescript
import { ComputeGPU } from '@computegpu/sdk';

const compute = new ComputeGPU({
  apiKey: 'your-api-key',
  solanaRpc: 'https://mainnet.helius-rpc.com/?api-key=YOUR_KEY', // optional
});

// Search available GPUs
const gpus = await compute.searchGPUs({ minVram: 24000 });
console.log(gpus);

// Rent a GPU
const instance = await compute.rent(gpus[0].id);
console.log(`SSH: ssh -p ${instance.sshPort} root@${instance.sshHost}`);

// List your instances
const instances = await compute.listInstances();

// Terminate when done
await compute.terminate(instance.id);
```

## API Reference

### `new ComputeGPU(config)`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `apiKey` | string | Yes | Your COMPUTE GPU API key |
| `solanaRpc` | string | No | Custom Solana RPC endpoint |
| `baseUrl` | string | No | API base URL (default: `https://computegpu.com/api`) |

---

### `compute.searchGPUs(options?)`

Search available GPU machines.

**Options:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `minVram` | number | 8000 | Minimum VRAM in MB |
| `gpuName` | string | — | Filter by GPU name (e.g. "RTX 4090") |
| `limit` | number | 50 | Max results |
| `maxPrice` | number | — | Max $/hr |
| `region` | string | — | Filter by region |

**Response:**

```typescript
interface GpuOffer {
  id: number;
  gpu_name: string;
  gpu_ram: number;        // MB
  num_gpus: number;
  cpu_cores: number;
  cpu_ram: number;        // MB
  disk_space: number;     // GB
  dph_total: number;      // $/hr
  geolocation: string;
  reliability: number;
  cuda_max_good: number;
  inet_down: number;      // Mbps
  inet_up: number;        // Mbps
}
```

**Example:**

```typescript
// Get cheapest RTX 4090s
const offers = await compute.searchGPUs({
  gpuName: 'RTX 4090',
  limit: 10,
});

// Get GPUs with 48GB+ VRAM under $1/hr
const offers = await compute.searchGPUs({
  minVram: 48000,
  maxPrice: 1.0,
});
```

---

### `compute.rent(offerId, options?)`

Rent a GPU instance.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `offerId` | number | Yes | Offer ID from search results |
| `image` | string | No | Docker image (default: CUDA base image) |
| `disk` | number | No | Disk space in GB (default: 32) |
| `onstart` | string | No | Bash command to run on start |

**Response:**

```typescript
interface RentResult {
  success: boolean;
  instanceId: number;
}
```

**Example:**

```typescript
const result = await compute.rent(12345678, {
  disk: 64,
  onstart: 'pip install transformers',
});
```

---

### `compute.listInstances()`

List all your active instances.

**Response:**

```typescript
interface Instance {
  id: number;
  actual_status: string;    // "running" | "loading" | "exited"
  gpu_name: string;
  num_gpus: number;
  gpu_ram: number;
  cpu_cores: number;
  cpu_ram: number;
  disk_space: number;
  dph_total: number;
  ssh_host: string;
  ssh_port: number;
  ports: Record<string, { HostIp: string; HostPort: string }[]>;
  geolocation: string;
  start_date: number;
  jupyter_token: string;
}
```

---

### `compute.getInstance(instanceId)`

Get details for a specific instance.

```typescript
const inst = await compute.getInstance(12345678);
console.log(`Status: ${inst.actual_status}`);
console.log(`SSH: ssh -p ${inst.ssh_port} root@${inst.ssh_host}`);
```

---

### `compute.terminate(instanceId)`

Terminate/destroy an instance. Stops all charges immediately.

```typescript
await compute.terminate(12345678);
```

---

### `compute.setSSHKey(publicKey)`

Set your SSH public key for instance access.

```typescript
await compute.setSSHKey('ssh-ed25519 AAAAC3NzaC1lZDI1NTE5... user@host');
```

---

### `compute.getSSHKey()`

Get your current SSH public key.

```typescript
const key = await compute.getSSHKey();
```

---

## REST API

If you prefer raw HTTP requests:

### Base URL

```
https://computegpu.com/api
```

### Authentication

All requests require an `Authorization` header:

```
Authorization: Bearer YOUR_API_KEY
```

### Endpoints

#### `GET /api/gpus`

Search available GPUs.

Query params: `minVram`, `gpu`, `limit`

```bash
curl https://computegpu.com/api/gpus?minVram=24000&limit=10 \
  -H "Authorization: Bearer YOUR_API_KEY"
```

#### `POST /api/pods`

Create an instance.

```bash
curl -X POST https://computegpu.com/api/pods \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"offerId": 12345678}'
```

#### `GET /api/pods`

List your instances.

```bash
curl https://computegpu.com/api/pods \
  -H "Authorization: Bearer YOUR_API_KEY"
```

#### `POST /api/pods/:id`

Terminate an instance.

```bash
curl -X POST https://computegpu.com/api/pods/12345678 \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"action": "terminate"}'
```

#### `GET /api/sol-price`

Get current SOL/USD price.

```bash
curl https://computegpu.com/api/sol-price
```

#### `POST /api/ssh-key`

Set SSH public key.

```bash
curl -X POST https://computegpu.com/api/ssh-key \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"sshKey": "ssh-ed25519 AAAAC3..."}'
```

---

## Solana Payment Flow

When renting via the web interface, payment is handled automatically:

1. Instance is created
2. SOL payment (1hr deposit) is sent to the treasury wallet
3. Rental is recorded on-chain

For API usage, billing is handled through your COMPUTE GPU account balance.

---

## Examples

### Rent cheapest GPU and run a training job

```typescript
import { ComputeGPU } from '@computegpu/sdk';

const compute = new ComputeGPU({ apiKey: process.env.COMPUTE_API_KEY });

async function main() {
  // Find cheapest GPU with 24GB+ VRAM
  const gpus = await compute.searchGPUs({ minVram: 24000, limit: 1 });
  
  if (gpus.length === 0) {
    console.log('No GPUs available');
    return;
  }

  console.log(`Renting ${gpus[0].gpu_name} at $${gpus[0].dph_total.toFixed(3)}/hr`);
  
  // Rent it
  const { instanceId } = await compute.rent(gpus[0].id, {
    onstart: 'pip install torch transformers && python /workspace/train.py',
  });

  // Wait for it to be ready
  let instance;
  do {
    await new Promise(r => setTimeout(r, 5000));
    instance = await compute.getInstance(instanceId);
    console.log(`Status: ${instance.actual_status}`);
  } while (instance.actual_status !== 'running');

  console.log(`Ready! SSH: ssh -p ${instance.ssh_port} root@${instance.ssh_host}`);
}

main();
```

### Monitor and auto-terminate

```typescript
import { ComputeGPU } from '@computegpu/sdk';

const compute = new ComputeGPU({ apiKey: process.env.COMPUTE_API_KEY });

// Terminate all instances older than 2 hours
async function cleanup() {
  const instances = await compute.listInstances();
  const now = Date.now() / 1000;

  for (const inst of instances) {
    const hours = (now - inst.start_date) / 3600;
    if (hours > 2) {
      console.log(`Terminating ${inst.id} (${inst.gpu_name}, ${hours.toFixed(1)}hrs)`);
      await compute.terminate(inst.id);
    }
  }
}

cleanup();
```

---

## Token

$COMPUTEGPU — [pump.fun](https://pump.fun/coin/B51QUVCoSCrTTABokkpv2hFzRKcgV84QKA7JDQukpump)

First-time renters receive **10,000 $COMPUTEGPU** tokens airdropped within 24 hours of their first purchase.

---

## Links

- Website: [computegpu.com](https://computegpu.com)
- Twitter: [@TryCompute](https://x.com/TryCompute)
- Token: [pump.fun](https://pump.fun/coin/B51QUVCoSCrTTABokkpv2hFzRKcgV84QKA7JDQukpump)
