"use client"

import { useState } from "react"
import Image from "next/image"
import { ImageIcon, ShoppingCart } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { useSolanaWallet } from "@/hooks/use-solana-wallet"
import { useGridStore } from "@/hooks/use-grid-store"

// Initial owner wallet address
const INITIAL_OWNER_WALLET = "4RoLEw2ecABi5Q5oqVybgaR3xtdFEpiN79tKYJ5txpff"

export default function GridDisplay() {
  const { toast } = useToast()
  const { connected, publicKey, connection, sendTransaction } = useSolanaWallet()
  const { grid, purchaseBlock, loading } = useGridStore()
  const [selectedBlock, setSelectedBlock] = useState<number | null>(null)
  const [purchaseDialogOpen, setPurchaseDialogOpen] = useState(false)

  const handleBlockClick = (index: number) => {
    if (!connected) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to purchase blocks",
        variant: "destructive",
      })
      return
    }

    // Don't allow purchase of your own blocks
    if (publicKey && grid[index].owner === publicKey.toString()) {
      toast({
        title: "You already own this block",
        description: "Visit 'My Blocks' to manage your blocks",
      })
      return
    }

    // Only allow purchase of blocks that are for sale
    if (!grid[index].forSale) {
      toast({
        title: "Block not for sale",
        description: "This block is not currently for sale",
        variant: "destructive",
      })
      return
    }

    setSelectedBlock(index)
    setPurchaseDialogOpen(true)
  }

  const handlePurchase = async () => {
    if (selectedBlock === null) return

    try {
      const showToast = (title: string, description: string, variant: "default" | "destructive" = "default") => {
        toast({
          title,
          description,
          variant,
        })
      }

      await purchaseBlock(selectedBlock, publicKey, connection, sendTransaction, showToast)
      setPurchaseDialogOpen(false)
    } catch (error) {
      console.error("Purchase error:", error)
    }
  }

  const getBlockPrice = (index: number) => {
    if (index !== null && grid[index] && grid[index].price !== null) {
      return grid[index].price
    }

    // Default pricing logic for new blocks
    const soldBlocks = grid.filter((block) => block.owner !== INITIAL_OWNER_WALLET).length
    const tier = Math.floor(soldBlocks / 10)
    return 0.005 + tier * 0.005 // Initial price and increment reduced to 0.005 SOL
  }

  // Calculate how many blocks have been sold (not owned by initial owner)
  const soldBlocks = grid.filter((block) => block.owner !== INITIAL_OWNER_WALLET).length

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-8">
        {grid.map((block, index) => {
          const isOwnedByInitialOwner = block.owner === INITIAL_OWNER_WALLET
          const isForSale = block.forSale

          return (
            <div
              key={index}
              className={`aspect-square border rounded-md overflow-hidden cursor-pointer transition-all hover:opacity-90 ${
                isOwnedByInitialOwner
                  ? "border-purple-500/50 shadow-sm shadow-purple-500/20"
                  : block.owner
                    ? "border-cyan-500/50 shadow-sm shadow-cyan-500/20"
                    : "border-gray-700 hover:border-gray-600"
              } ${isForSale ? "ring-1 ring-green-500/30" : ""}`}
              onClick={() => handleBlockClick(index)}
            >
              {block.imageUrl ? (
                <Image
                  src={block.imageUrl || "/placeholder.svg"}
                  alt={`Grid block ${index}`}
                  width={80}
                  height={80}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-900/50">
                  {isOwnedByInitialOwner && isForSale ? (
                    <ShoppingCart className="h-4 w-4 text-purple-500/70" />
                  ) : (
                    <ImageIcon className="h-4 w-4 text-cyan-500/70" />
                  )}
                </div>
              )}
              {isForSale && (
                <div className="absolute bottom-0 right-0 bg-green-500/80 text-white text-[8px] px-1 rounded-tl">
                  {getBlockPrice(index)} SOL
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="flex justify-between items-center p-4 bg-gray-900/50 border border-gray-800 rounded-lg backdrop-blur-sm">
        <div>
          <p className="text-sm font-medium text-gray-400">Initial owner</p>
          <p className="text-xs text-purple-400 truncate max-w-[150px]">
            {INITIAL_OWNER_WALLET.slice(0, 8)}...{INITIAL_OWNER_WALLET.slice(-8)}
          </p>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-400">Blocks sold</p>
          <p className="text-2xl font-bold text-purple-400">{soldBlocks} / 64</p>
        </div>
      </div>

      <Dialog open={purchaseDialogOpen} onOpenChange={setPurchaseDialogOpen}>
        <DialogContent className="bg-gray-900 border-gray-800">
          <DialogHeader>
            <DialogTitle className="text-cyan-400">
              Purchase Block #{selectedBlock !== null ? selectedBlock + 1 : ""}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              {selectedBlock !== null && grid[selectedBlock].owner === INITIAL_OWNER_WALLET ? (
                <span>
                  This is an initial sale. Payment of {getBlockPrice(selectedBlock)} SOL will go to the initial owner.
                </span>
              ) : (
                <span>
                  This block costs {getBlockPrice(selectedBlock)} SOL. Once purchased, you can upload your own image.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPurchaseDialogOpen(false)}
              className="border-gray-700 text-gray-400"
            >
              Cancel
            </Button>
            <Button
              onClick={handlePurchase}
              disabled={loading}
              className="bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500"
            >
              {loading
                ? "Processing..."
                : `Purchase for ${selectedBlock !== null ? getBlockPrice(selectedBlock) : 0} SOL`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
