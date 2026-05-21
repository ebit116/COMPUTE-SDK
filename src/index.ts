export interface ComputeGPUConfig {
  apiKey: string;
  baseUrl?: string;
  solanaRpc?: string;
}

export interface GpuOffer {
  id: number;
  gpu_name: string;
  gpu_ram: number;
  num_gpus: number;
  cpu_cores: number;
  cpu_ram: number;
  disk_space: number;
  dph_total: number;
  geolocation: string;
  reliability: number;
  cuda_max_good: number;
  inet_down: number;
  inet_up: number;
  hosting_type: number;
}

export interface Instance {
  id: number;
  actual_status: string;
  intended_status: string;
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
  cur_state: string;
  jupyter_token: string;
  status_msg: string;
}

export interface SearchOptions {
  minVram?: number;
  gpuName?: string;
  limit?: number;
  maxPrice?: number;
  region?: string;
}

export interface RentOptions {
  image?: string;
  disk?: number;
  onstart?: string;
}

export interface RentResult {
  success: boolean;
  instanceId: number;
}

export class ComputeGPU {
  private apiKey: string;
  private baseUrl: string;

  constructor(config: ComputeGPUConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || "https://computegpu.com/api";
  }

  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`COMPUTE GPU API error ${res.status}: ${text}`);
    }

    return res.json();
  }

  /**
   * Search available GPU machines
   */
  async searchGPUs(options?: SearchOptions): Promise<GpuOffer[]> {
    const params = new URLSearchParams();
    if (options?.minVram) params.set("minVram", String(options.minVram));
    if (options?.gpuName) params.set("gpu", options.gpuName);
    if (options?.limit) params.set("limit", String(options.limit));

    const data = await this.request<{ offers: GpuOffer[] }>(
      `/gpus?${params.toString()}`
    );

    let offers = data.offers;

    if (options?.maxPrice) {
      offers = offers.filter((o) => o.dph_total <= options.maxPrice!);
    }
    if (options?.region) {
      offers = offers.filter((o) =>
        o.geolocation?.toLowerCase().includes(options.region!.toLowerCase())
      );
    }

    return offers;
  }

  /**
   * Rent a GPU instance
   */
  async rent(offerId: number, options?: RentOptions): Promise<RentResult> {
    const data = await this.request<{ success: boolean; instanceId: number }>(
      "/pods",
      {
        method: "POST",
        body: JSON.stringify({
          offerId,
          image: options?.image,
          disk: options?.disk,
        }),
      }
    );

    return data;
  }

  /**
   * List all active instances
   */
  async listInstances(): Promise<Instance[]> {
    const data = await this.request<{ pods: Instance[] }>("/pods");
    return data.pods;
  }

  /**
   * Get a specific instance by ID
   */
  async getInstance(instanceId: number): Promise<Instance> {
    const instances = await this.listInstances();
    const instance = instances.find((i) => i.id === instanceId);
    if (!instance) throw new Error(`Instance ${instanceId} not found`);
    return instance;
  }

  /**
   * Terminate/destroy an instance
   */
  async terminate(instanceId: number): Promise<void> {
    await this.request(`/pods/${instanceId}`, {
      method: "POST",
      body: JSON.stringify({ action: "terminate" }),
    });
  }

  /**
   * Set SSH public key for instance access
   */
  async setSSHKey(publicKey: string): Promise<void> {
    await this.request("/ssh-key", {
      method: "POST",
      body: JSON.stringify({ sshKey: publicKey }),
    });
  }

  /**
   * Get current SSH public key
   */
  async getSSHKey(): Promise<string | null> {
    const data = await this.request<{ hasKey: boolean; key: string | null }>(
      "/ssh-key"
    );
    return data.key;
  }

  /**
   * Get current SOL/USD price
   */
  async getSolPrice(): Promise<number | null> {
    const data = await this.request<{ price: number | null }>("/sol-price");
    return data.price;
  }
}

export default ComputeGPU;
