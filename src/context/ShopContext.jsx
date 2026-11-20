"use client";

import React, {
  createContext,
  useContext,
  useState,
  useMemo,
  useEffect,
  useCallback,
} from "react";
import { useRouter } from "next/navigation";
import { api, getApiErrorMessage } from "@/lib/api";

const ShopContext = createContext(null);

export function ShopProvider({ children }) {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [bag, setBag] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [isBagOpen, setIsBagOpen] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [bagError, setBagError] = useState("");

  const syncBagAndAutoCoupon = useCallback(async () => {
    try {
      const { data: bagRes } = await api.get("/bag");
      const items = bagRes.data?.items || [];
      setBag(items);
      setWishlist(bagRes.data?.wishlist || []);

      if (items.length > 0) {
        const { data: autoRes } = await api.get("/coupons/auto");
        setAppliedCoupon((prev) => {
          if (prev && prev.applyMode === "MANUAL") return prev;
          return autoRes.data?.coupon || null;
        });
      } else {
        setAppliedCoupon(null);
      }
    } catch {
      setBag([]);
      setWishlist([]);
      setAppliedCoupon(null);
    }
  }, []);

  const refreshSession = useCallback(async () => {
    setAuthLoading(true);
    try {
      const { data } = await api.get("/auth/me");
      setUser(data.data?.user || null);
      await syncBagAndAutoCoupon();
    } catch {
      setUser(null);
      setBag([]);
      setWishlist([]);
      setAppliedCoupon(null);
    } finally {
      setAuthLoading(false);
    }
  }, [syncBagAndAutoCoupon]);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } finally {
      setUser(null);
      setBag([]);
      setWishlist([]);
      setAppliedCoupon(null);
      setIsBagOpen(false);
    }
  };

  const addToBag = async (product, selectedSize = "M") => {
    setBagError("");
    if (!user) {
      router.push("/account?next=bag");
      return false;
    }

    try {
      const { data } = await api.post("/bag/items", {
        productId: product.slug || product.id,
        size: selectedSize,
        quantity: 1,
      });
      setBag(data.data?.items || []);
      setIsBagOpen(true);
      await syncBagAndAutoCoupon();
      return true;
    } catch (err) {
      setBagError(getApiErrorMessage(err, "Could not add item to bag."));
      setIsBagOpen(true);
      return false;
    }
  };

  const updateQuantity = async (id, size, delta) => {
    setBagError("");
    if (!user) return;
    try {
      const { data } = await api.patch("/bag/items", {
        productId: id,
        size,
        delta,
      });
      setBag(data.data?.items || []);
      await syncBagAndAutoCoupon();
    } catch (err) {
      setBagError(getApiErrorMessage(err, "Could not update quantity."));
    }
  };

  const toggleWishlist = async (productId) => {
    if (!user) {
      router.push("/account?next=wishlist");
      return;
    }
    try {
      const { data } = await api.post("/bag/wishlist/toggle", { productId });
      setWishlist(data.data?.wishlist || []);
    } catch (err) {
      console.error("Wishlist toggle error:", getApiErrorMessage(err));
    }
  };

  const applyCoupon = async (code) => {
    const { data } = await api.post("/coupons/validate", { code });
    const coupon = { ...data.data, applyMode: "MANUAL" };
    setAppliedCoupon(coupon);
    return coupon;
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
  };

  const bagCount = useMemo(
    () => bag.reduce((sum, item) => sum + item.quantity, 0),
    [bag]
  );

  const bagSubtotal = useMemo(
    () => bag.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [bag]
  );

  const discountInr = appliedCoupon?.discountInr || 0;

  return (
    <ShopContext.Provider
      value={{
        user,
        authLoading,
        refreshSession,
        logout,
        bag,
        wishlist,
        isBagOpen,
        setIsBagOpen,
        addToBag,
        updateQuantity,
        toggleWishlist,
        bagCount,
        bagSubtotal,
        appliedCoupon,
        discountInr,
        applyCoupon,
        removeCoupon,
        bagError,
        setBagError,
        syncBagAndAutoCoupon,
      }}
    >
      {children}
    </ShopContext.Provider>
  );
}

export const useShop = () => {
  const context = useContext(ShopContext);
  if (!context) {
    throw new Error("useShop must be used within a ShopProvider");
  }
  return context;
};