import {
    Metaplex, keypairIdentity, bundlrStorage,
    freezeDelegatedNftBuilder,
    token,
} from "@metaplex-foundation/js";
import { Connection, Keypair, clusterApiUrl, LAMPORTS_PER_SOL, Transaction, sendAndConfirmTransaction, PublicKey, PUBLIC_KEY_LENGTH, TransactionInstruction } from "@solana/web3.js";
import {
    getAccount,
    createApproveInstruction,
    createRevokeInstruction
} from '@solana/spl-token';

function keypairFromSeed(seed: string) {
    const expandedSeed = Uint8Array.from(Buffer.from(`${seed}                                           `));
    return Keypair.fromSeed(expandedSeed.slice(0, 32));
}

async function main() {
    const connection = new Connection("http://localhost:8899", { commitment: "confirmed" });
    const wallet = keypairFromSeed("noah keypair");

    const metaplex = Metaplex.make(connection)
        .use(keypairIdentity(wallet))
        .use(bundlrStorage());

    const { nft, mintAddress, tokenAddress } = await metaplex
        .nfts()
        .create({
            uri: "https://arweave.net/123",
            name: "My NFT",
            sellerFeeBasisPoints: 500,
        })
        .run();


    // 1. Approve the nft for freezing
    const approveIx = createApproveInstruction(tokenAddress, wallet.publicKey, wallet.publicKey, 1);
    // 2. Freeze the nft
    const freezeIxs: TransactionInstruction[] = metaplex
        .nfts()
        .builders()
        .freezeDelegatedNft({ tokenAddress, delegateAuthority: wallet, mintAddress })
        .getInstructions();

    // Put all 3 instructions together
    let tx = new Transaction().add(approveIx);
    freezeIxs.map((ix) => {
        tx = tx.add(ix);
    });
    const txId = await sendAndConfirmTransaction(connection, tx, [wallet], {
        skipPreflight: true,
        commitment: "confirmed",
    });
    console.log("Froze nft in tx:", txId);

    const acc = await getAccount(connection, tokenAddress);
    console.log(`NFT token addr: ${tokenAddress.toString()} is frozen: ${acc.isFrozen}`);
}

main();