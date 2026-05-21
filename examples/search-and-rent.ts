import { ComputeGPU } from "../src";

const compute = new ComputeGPU({
  apiKey: process.env.COMPUTE_API_KEY!,
});

async function main() {
  // Search for GPUs with 24GB+ VRAM
  console.log("Searching for GPUs...\n");
  const gpus = await compute.searchGPUs({
    minVram: 24000,
    limit: 10,
  });

  gpus.forEach((g) => {
    console.log(
      `${g.gpu_name} | ${(g.gpu_ram / 1024).toFixed(0)}GB VRAM | ${g.cpu_cores} CPU | $${g.dph_total.toFixed(3)}/hr | ${g.geolocation}`
    );
  });

  if (gpus.length === 0) {
    console.log("No GPUs available");
    return;
  }

  // Rent the cheapest one
  const cheapest = gpus[0];
  console.log(`\nRenting ${cheapest.gpu_name} at $${cheapest.dph_total.toFixed(3)}/hr...`);

  const { instanceId } = await compute.rent(cheapest.id);
  console.log(`Instance created: ${instanceId}`);

  // Poll until running
  let instance;
  do {
    await new Promise((r) => setTimeout(r, 5000));
    instance = await compute.getInstance(instanceId);
    console.log(`Status: ${instance.actual_status} - ${instance.status_msg || ""}`);
  } while (instance.actual_status !== "running");

  console.log(`\nReady!`);
  console.log(`SSH: ssh -p ${instance.ssh_port} root@${instance.ssh_host}`);
  console.log(`Cost: $${instance.dph_total.toFixed(3)}/hr`);
}

main().catch(console.error);
