// merkledrop-claimer/src/claim.ts
// Usage:
//   node dist/claim.js --rpc $RPC_URL --pk $PRIVATE_KEY --distributor 0xDistributor --proofs proofs.json
// proofs.json format: [{"index":0,"account":"0x..","amount":"1230000000000000000","proof":["0x..","0x.."]}, ...]

import { readFileSync } from "fs";
import { ethers } from "ethers";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

const abi = [
  "function claim(uint256 index, address account, uint256 amount, bytes32[] merkleProof) external",
  "function isClaimed(uint256 index) view returns (bool)"
];

async function main() {
  const argv = await yargs(hideBin(process.argv))
    .option("rpc", { type: "string", demandOption: true })
    .option("pk", { type: "string", demandOption: true })
    .option("distributor", { type: "string", demandOption: true })
    .option("proofs", { type: "string", demandOption: true })
    .parse();

  const provider = new ethers.JsonRpcProvider(argv.rpc);
  const wallet = new ethers.Wallet(argv.pk, provider);
  const dist = new ethers.Contract(argv.distributor, abi, wallet);

  const entries = JSON.parse(readFileSync(argv.proofs, "utf8"));

  for (const e of entries) {
    const claimed = await dist.isClaimed(e.index);
    if (claimed) {
      console.log(\`index \${e.index} already claimed\`);
      continue;
    }
    console.log(\`claiming index \${e.index} for \${e.account} amount \${e.amount}...\`);
    const tx = await dist.claim(e.index, e.account, e.amount, e.proof);
    console.log("sent:", tx.hash);
    const rcpt = await tx.wait();
    console.log("confirmed:", rcpt?.hash);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
