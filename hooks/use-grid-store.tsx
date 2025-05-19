"use client"

import { create } from "zustand"
import { useWallet } from "./use-wallet"

// Initial owner wallet address
const INITIAL_OWNER_WALLET = "4RoLEw2ecABi5Q5oqVybgaR3xtdFEpiN79tKYJ5txpff"

interface GridBlock {
  owner: string | null
  imageUrl: string | null
  forSale: boolean
  price: number | null
  isFirstSale: boolean // Track if this is the first sale
}

interface GridStore {
  grid: GridBlock[]
  loading: boolean
  purchaseBlock: (index: number) => Promise<void>
  uploadImage: (index: number, file: File) => Promise<void>
  listForSale: (index: number, price: number) => Promise<void>
  purchaseFromUser: (index: number) => Promise<void>
}

// Initialize a 8x8 grid (64 blocks) with the initial owner
const initialGrid: GridBlock[] = Array(64)
  .fill(null)
  .map(() => ({
    owner: INITIAL_OWNER_WALLET, // Set initial owner
    imageUrl: null,
    forSale: true, // All blocks are initially for sale
    price: 0.1, // Initial price
    isFirstSale: true, // Mark as first sale
  }))

// In a real application, this would interact with a Solana program
const useGridStoreBase = create<GridStore>((set, get) => ({
  grid: initialGrid,
  loading: false,

  purchaseBlock: async (index: number) => {
    const { grid } = get()

    // Check if block is for sale
    if (!grid[index].forSale) {
      throw new Error("This block is not for sale")
    }

    set({ loading: true })

    try {
      // Simulate blockchain transaction
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // In a real app, this would be a Solana transaction
      const wallet = useWallet.getState()
      if (!wallet.connected || !wallet.publicKey) {
        throw new Error("Wallet not connected")
      }

      // Calculate price based on how many blocks are sold
      const soldBlocks = grid.filter((block) => block.owner !== INITIAL_OWNER_WALLET).length
      const tier = Math.floor(soldBlocks / 10)
      const price = 0.1 + tier * 0.1

      console.log(`Purchase from ${grid[index].isFirstSale ? "initial owner" : "user"} at price ${price} SOL`)

      // In a real implementation, payment would be sent to INITIAL_OWNER_WALLET if isFirstSale is true
      // Otherwise, payment would go to the current owner

      // Update the grid
      const newGrid = [...grid]
      newGrid[index] = {
        ...newGrid[index],
        owner: wallet.publicKey.toString(),
        forSale: false,
        price: null,
        isFirstSale: false, // No longer the first sale
      }

      set({ grid: newGrid, loading: false })
    } catch (error) {
      set({ loading: false })
      throw error
    }
  },

  uploadImage: async (index: number, file: File) => {
    const { grid } = get()

    // Check if user owns the block
    const wallet = useWallet.getState()
    if (!wallet.connected || !wallet.publicKey) {
      throw new Error("Wallet not connected")
    }

    if (grid[index].owner !== wallet.publicKey.toString()) {
      throw new Error("You don't own this block")
    }

    set({ loading: true })

    try {
      // Simulate upload
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // In a real app, this would upload to IPFS or another storage
      const imageUrl = URL.createObjectURL(file)

      // Update the grid
      const newGrid = [...grid]
      newGrid[index] = {
        ...newGrid[index],
        imageUrl,
      }

      set({ grid: newGrid, loading: false })
    } catch (error) {
      set({ loading: false })
      throw error
    }
  },

  listForSale: async (index: number, price: number) => {
    const { grid } = get()

    // Check if user owns the block
    const wallet = useWallet.getState()
    if (!wallet.connected || !wallet.publicKey) {
      throw new Error("Wallet not connected")
    }

    if (grid[index].owner !== wallet.publicKey.toString()) {
      throw new Error("You don't own this block")
    }

    set({ loading: true })

    try {
      // Simulate blockchain transaction
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Update the grid
      const newGrid = [...grid]
      newGrid[index] = {
        ...newGrid[index],
        forSale: true,
        price,
      }

      set({ grid: newGrid, loading: false })
    } catch (error) {
      set({ loading: false })
      throw error
    }
  },

  purchaseFromUser: async (index: number) => {
    const { grid } = get()

    // Check if block is for sale
    if (!grid[index].forSale) {
      throw new Error("This block is not for sale")
    }

    const wallet = useWallet.getState()
    if (!wallet.connected || !wallet.publicKey) {
      throw new Error("Wallet not connected")
    }

    // Check if user is trying to buy their own block
    if (grid[index].owner === wallet.publicKey.toString()) {
      throw new Error("You already own this block")
    }

    set({ loading: true })

    try {
      // Simulate blockchain transaction
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // In a real implementation, payment would be sent to the current owner
      console.log(`Purchase from user at price ${grid[index].price} SOL`)

      // Update the grid
      const newGrid = [...grid]
      newGrid[index] = {
        ...newGrid[index],
        owner: wallet.publicKey.toString(),
        forSale: false,
        isFirstSale: false, // No longer the first sale
        // Keep the image if there is one
      }

      set({ grid: newGrid, loading: false })
    } catch (error) {
      set({ loading: false })
      throw error
    }
  },
}))

export function useGridStore() {
  return useGridStoreBase()
}
