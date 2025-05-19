"use client"

import { create } from "zustand"
import { PublicKey, type Connection, Transaction, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js"

// Initial owner wallet address - this would be the marketplace authority
const MARKETPLACE_AUTHORITY = "4RoLEw2ecABi5Q5oqVybgaR3xtdFEpiN79tKYJ5txpff"

interface GridBlock {
  id: number
  owner: string | null
  imageUrl: string | null
  forSale: boolean
  price: number | null
}

interface GridState {
  grid: GridBlock[]
  loading: boolean
}

interface GridActions {
  purchaseBlock: (
    index: number,
    publicKey: PublicKey | null,
    connection: Connection,
    sendTransaction: (transaction: Transaction) => Promise<string>,
    showToast: (title: string, description: string, variant?: "default" | "destructive") => void,
  ) => Promise<void>
  uploadImage: (
    index: number,
    file: File,
    publicKey: PublicKey | null,
    showToast: (title: string, description: string, variant?: "default" | "destructive") => void,
  ) => Promise<void>
  listForSale: (
    index: number,
    price: number,
    publicKey: PublicKey | null,
    connection: Connection,
    sendTransaction: (transaction: Transaction) => Promise<string>,
    showToast: (title: string, description: string, variant?: "default" | "destructive") => void,
  ) => Promise<void>
  purchaseFromUser: (
    index: number,
    publicKey: PublicKey | null,
    connection: Connection,
    sendTransaction: (transaction: Transaction) => Promise<string>,
    showToast: (title: string, description: string, variant?: "default" | "destructive") => void,
  ) => Promise<void>
  fetchGridData: () => Promise<void>
}

type GridStore = GridState & GridActions

// Initialize a 8x8 grid (64 blocks)
const initialGrid: GridBlock[] = Array(64)
  .fill(null)
  .map((_, index) => ({
    id: index,
    owner: MARKETPLACE_AUTHORITY, // Set initial owner
    imageUrl: null,
    forSale: true, // All blocks are initially for sale
    price: 0.005, // Initial price reduced to 0.005 SOL
  }))

export const useGridStore = create<GridStore>((set, get) => ({
  grid: initialGrid,
  loading: false,

  fetchGridData: async () => {
    // In a real application, this would fetch grid data from a database or blockchain
    // For now, we'll just use the initial grid
    set({ grid: initialGrid })
  },

  purchaseBlock: async (index, publicKey, connection, sendTransaction, showToast) => {
    const { grid } = get()

    // Check if block is for sale
    if (!grid[index].forSale) {
      throw new Error("This block is not for sale")
    }

    if (!publicKey) {
      throw new Error("Wallet not connected")
    }

    set({ loading: true })

    try {
      // Calculate price based on how many blocks are sold
      const soldBlocks = grid.filter((block) => block.owner !== MARKETPLACE_AUTHORITY).length
      const tier = Math.floor(soldBlocks / 10)
      const price = 0.005 + tier * 0.005 // Price increment also reduced to 0.005 SOL

      // Create a transaction to transfer SOL
      const marketplacePublicKey = new PublicKey(MARKETPLACE_AUTHORITY)
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: marketplacePublicKey,
          lamports: price * LAMPORTS_PER_SOL,
        }),
      )

      // Get the latest blockhash
      const { blockhash } = await connection.getLatestBlockhash()
      transaction.recentBlockhash = blockhash
      transaction.feePayer = publicKey

      // Send the transaction
      const signature = await sendTransaction(transaction)

      // Wait for confirmation
      const confirmation = await connection.confirmTransaction(signature, "confirmed")

      if (confirmation.value.err) {
        throw new Error("Transaction failed")
      }

      console.log(`Purchase from initial owner at price ${price} SOL, signature: ${signature}`)

      // Update the grid
      const newGrid = [...grid]
      newGrid[index] = {
        ...newGrid[index],
        owner: publicKey.toString(),
        forSale: false,
        price: null,
      }

      set({ grid: newGrid, loading: false })

      showToast("Block purchased!", "You can now upload an image to your block")
    } catch (error) {
      set({ loading: false })
      showToast("Purchase failed", error instanceof Error ? error.message : "Unknown error occurred", "destructive")
      throw error
    }
  },

  uploadImage: async (index, file, publicKey, showToast) => {
    const { grid } = get()

    // Check if user owns the block
    if (!publicKey) {
      throw new Error("Wallet not connected")
    }

    if (grid[index].owner !== publicKey.toString()) {
      throw new Error("You don't own this block")
    }

    set({ loading: true })

    try {
      // In a real app, this would upload to a storage service
      const imageUrl = URL.createObjectURL(file)

      // Update the grid
      const newGrid = [...grid]
      newGrid[index] = {
        ...newGrid[index],
        imageUrl,
      }

      set({ grid: newGrid, loading: false })
      showToast("Image uploaded!", "Your image has been successfully uploaded to the block")
    } catch (error) {
      set({ loading: false })
      showToast("Upload failed", error instanceof Error ? error.message : "Unknown error occurred", "destructive")
      throw error
    }
  },

  listForSale: async (index, price, publicKey, connection, sendTransaction, showToast) => {
    const { grid } = get()

    // Check if user owns the block
    if (!publicKey) {
      throw new Error("Wallet not connected")
    }

    if (grid[index].owner !== publicKey.toString()) {
      throw new Error("You don't own this block")
    }

    set({ loading: true })

    try {
      // In a real implementation, we would create a transaction to list the block for sale
      // For now, we'll just update the local state

      // Update the grid
      const newGrid = [...grid]
      newGrid[index] = {
        ...newGrid[index],
        forSale: true,
        price,
      }

      set({ grid: newGrid, loading: false })
      showToast("Block listed for sale!", `Your block is now available for ${price} SOL`)
    } catch (error) {
      set({ loading: false })
      showToast("Listing failed", error instanceof Error ? error.message : "Unknown error occurred", "destructive")
      throw error
    }
  },

  purchaseFromUser: async (index, publicKey, connection, sendTransaction, showToast) => {
    const { grid } = get()

    // Check if block is for sale
    if (!grid[index].forSale) {
      throw new Error("This block is not for sale")
    }

    if (!publicKey) {
      throw new Error("Wallet not connected")
    }

    // Check if user is trying to buy their own block
    if (grid[index].owner === publicKey.toString()) {
      throw new Error("You already own this block")
    }

    set({ loading: true })

    try {
      const price = grid[index].price || 0
      const sellerPublicKey = new PublicKey(grid[index].owner || "")

      // Create a transaction to transfer SOL
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: sellerPublicKey,
          lamports: price * LAMPORTS_PER_SOL,
        }),
      )

      // Get the latest blockhash
      const { blockhash } = await connection.getLatestBlockhash()
      transaction.recentBlockhash = blockhash
      transaction.feePayer = publicKey

      // Send the transaction
      const signature = await sendTransaction(transaction)

      // Wait for confirmation
      const confirmation = await connection.confirmTransaction(signature, "confirmed")

      if (confirmation.value.err) {
        throw new Error("Transaction failed")
      }

      console.log(`Purchase from user at price ${price} SOL, signature: ${signature}`)

      // Update the grid
      const newGrid = [...grid]
      newGrid[index] = {
        ...newGrid[index],
        owner: publicKey.toString(),
        forSale: false,
        price: null,
      }

      set({ grid: newGrid, loading: false })
      showToast("Block purchased!", "You can now upload an image to your block")
    } catch (error) {
      set({ loading: false })
      showToast("Purchase failed", error instanceof Error ? error.message : "Unknown error occurred", "destructive")
      throw error
    }
  },
}))
