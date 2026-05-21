import { ComputeGPU } from "../src";
import { readFileSync } from "fs";
import { join } from "path";
import { homedir } from "os";

const compute = new ComputeGPU({
  apiKey: process.env.COMPUTE_API_KEY!,
});

async function setupSSH() {
  // Check if key already set
  const existing = await compute.getSSHKey();
  if (existing) {
    console.log("SSH key already configured:");
    console.log(`  ${existing.substring(0, 50)}...`);
    return;
  }

  // Read local public key
  const keyPath = join(homedir(), ".ssh", "id_ed25519.pub");
  try {
    const pubKey = readFileSync(keyPath, "utf-8").trim();
    console.log(`Found key at ${keyPath}`);
    console.log(`Setting SSH key...`);

    await compute.setSSHKey(pubKey);
    console.log("Done! You can now SSH into rented instances.");
  } catch {
    console.error(`No SSH key found at ${keyPath}`);
    console.error("Generate one with: ssh-keygen -t ed25519");
  }
}

setupSSH().catch(console.error);
