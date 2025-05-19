"use client"

import type React from "react"

import { useState, useRef } from "react"
import Image from "next/image"
import { ImageIcon, Upload, Tag } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { useSolanaWallet } from "@/hooks/use-solana-wallet"
import { useGridStore } from "@/hooks/use-grid-store"

export default function MyBlocksList() {
  const { toast } = useToast()
  const { connected, publicKey } = useSolanaWallet()
  const { grid, uploadImage, listForSale, loading } = useGridStore()
  const [selectedBlock, setSelectedBlock] = useState<number | null>(null)
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [sellDialogOpen, setSellDialogOpen] = useState(false)
  const [price, setPrice] = useState<string>("1.0")
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Filter blocks owned by the current user
  const myBlocks = connected && publicKey ? grid.filter((block) => block.owner === publicKey.toString()) : []

  const handleUpload = async (event: React.FormEvent) => {
    event.preventDefault()
    if (selectedBlock === null || !fileInputRef.current?.files?.length) return

    try {
      const file = fileInputRef.current.files[0]
      await uploadImage(selectedBlock, file)
      toast({
        title: "Image uploaded!",
        description: "Your image has been successfully uploaded to the block",
      })
      setUploadDialogOpen(false)
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      })
    }
  }

  const handleListForSale = async (event: React.FormEvent) => {
    event.preventDefault()
    if (selectedBlock === null) return

    try {
      const priceValue = Number.parseFloat(price)
      if (isNaN(priceValue) || priceValue <= 0) {
        throw new Error("Please enter a valid price")
      }

      await listForSale(selectedBlock, priceValue)
      toast({
        title: "Block listed for sale!",
        description: `Your block is now available for ${priceValue} SOL`,
      })
      setSellDialogOpen(false)
    } catch (error) {
      toast({
        title: "Listing failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      })
    }
  }

  if (!connected) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium">Wallet not connected</h3>
        <p className="text-muted-foreground mt-2">Please connect your wallet to view your blocks.</p>
      </div>
    )
  }

  if (myBlocks.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium">You don't own any blocks yet</h3>
        <p className="text-muted-foreground mt-2">Purchase blocks from the grid or marketplace to get started.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {myBlocks.map((block, index) => {
        const blockIndex = grid.findIndex((b) => b === block)
        return (
          <Card key={index}>
            <CardHeader className="pb-2">
              <CardTitle>Block #{blockIndex + 1}</CardTitle>
              <CardDescription>{block.forSale ? "Listed for sale" : "Not listed for sale"}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="aspect-square border rounded-md overflow-hidden mb-4">
                {block.imageUrl ? (
                  <Image
                    src={block.imageUrl || "/placeholder.svg"}
                    alt={`Grid block ${blockIndex}`}
                    width={300}
                    height={300}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-muted">
                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
              </div>
              {block.forSale && (
                <div className="flex justify-between items-center">
                  <span className="font-medium">Listed price:</span>
                  <span className="text-lg font-bold">{block.price} SOL</span>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setSelectedBlock(blockIndex)
                  setUploadDialogOpen(true)
                }}
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload
              </Button>
              <Button
                className="flex-1"
                onClick={() => {
                  setSelectedBlock(blockIndex)
                  setPrice(block.price?.toString() || "1.0")
                  setSellDialogOpen(true)
                }}
              >
                <Tag className="h-4 w-4 mr-2" />
                {block.forSale ? "Update" : "Sell"}
              </Button>
            </CardFooter>
          </Card>
        )
      })}

      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <form onSubmit={handleUpload}>
            <DialogHeader>
              <DialogTitle>Upload Image to Block #{selectedBlock !== null ? selectedBlock + 1 : ""}</DialogTitle>
              <DialogDescription>
                Choose an image to upload to your block. The image will be visible on the grid.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label htmlFor="image">Image</Label>
              <Input id="image" type="file" ref={fileInputRef} accept="image/*" required />
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setUploadDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Uploading..." : "Upload Image"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={sellDialogOpen} onOpenChange={setSellDialogOpen}>
        <DialogContent>
          <form onSubmit={handleListForSale}>
            <DialogHeader>
              <DialogTitle>
                {selectedBlock !== null && grid[selectedBlock]?.forSale ? "Update Listing" : "List Block for Sale"}
              </DialogTitle>
              <DialogDescription>
                Set a price in SOL for your block. Other users will be able to purchase it.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label htmlFor="price">Price (SOL)</Label>
              <Input
                id="price"
                type="number"
                step="0.1"
                min="0.1"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
              />
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setSellDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading
                  ? "Processing..."
                  : selectedBlock !== null && grid[selectedBlock]?.forSale
                    ? "Update Price"
                    : "List for Sale"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
