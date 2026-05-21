import { ComputeGPU } from "../src";

const compute = new ComputeGPU({
  apiKey: process.env.COMPUTE_API_KEY!,
});

/**
 * Terminate all instances older than a given number of hours
 */
async function cleanup(maxHours = 2) {
  const instances = await compute.listInstances();
  const now = Date.now() / 1000;

  console.log(`Found ${instances.length} active instance(s)\n`);

  for (const inst of instances) {
    const hours = (now - inst.start_date) / 3600;
    const status = inst.actual_status;

    console.log(
      `#${inst.id} | ${inst.gpu_name} | ${status} | ${hours.toFixed(1)}hrs | $${inst.dph_total.toFixed(3)}/hr`
    );

    if (hours > maxHours) {
      console.log(`  → Terminating (exceeded ${maxHours}hr limit)`);
      await compute.terminate(inst.id);
    }
  }

  console.log("\nDone.");
}

cleanup().catch(console.error);
