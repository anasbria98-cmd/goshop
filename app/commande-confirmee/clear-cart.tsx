"use client";
import { useEffect } from "react";
import { useStore } from "@/components/store-provider";
export function ClearCart() { const { clearCart } = useStore(); useEffect(() => clearCart(), [clearCart]); return null; }
