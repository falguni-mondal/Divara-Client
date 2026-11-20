"use client";

import React, {
  createContext,
  useContext,
  useState,
  useMemo,
  useEffect,
  useCallback,
  useRef,
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

  const userRoleRef = useRef(null);
  const appliedCouponRef = useRef(null);

  useEffect(() => {
    userRoleRef.current = user?.role || null;
  }, [user?.role]);

  useEffect(() => {
    appliedCouponRef.current = appliedCoupon;
  }, [appliedCoupon]);

  const isAdmin = user?.role === "admin" || user?.role === "super_admin";
  const isSuperAdmin =
    user?.role === "super_admin" && user?.email?.toLowerCase() === "admin@divara.com";

  const syncBagAndAutoCoupon = useCallback(async (roleOverride = null) => {
    const role = roleOverride || userRoleRef.current;
    if (role === "admin" || role === "super_admin") {
      setBag([]);
      setWishlist([]);
      setAppliedCoupon(null);
      return;
    }

    try {
      const { data: bagRes } = await api.get("/bag");
      const items = bagRes.data?.items || [];
      setBag(items);
      setWishlist(bagRes.data?.wishlist || []);

      if (items.length === 0) {
        setAppliedCoupon(null);
        return;
      }

      // If a manual coupon is applied, re-validate it against the updated bag subtotal
      const currentCoupon = appliedCouponRef.current;
      if (currentCoupon && currentCoupon.applyMode === "MANUAL" && currentCoupon.code) {
        try {
          const { data: revalRes } = await api.post("/coupons/validate", {
            code: currentCoupon.code,
          });
          setAppliedCoupon({ ...revalRes.data, applyMode: "MANUAL" });
          return;
        } catch {
          // Manual coupon no longer qualifies (e.g. bag dropped below minOrderSubtotal)
          setAppliedCoupon(null);
        }
      }

      const { data: autoRes } = await api.get("/coupons/auto");
      setAppliedCoupon(autoRes.data?.coupon || null);
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
      const fetchedUser = data.data?.user || null;
      userRoleRef.current = fetchedUser?.role || null;
      setUser(fetchedUser);
      await syncBagAndAutoCoupon(fetchedUser?.role);
    } catch {
      userRoleRef.current = null;
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
      userRoleRef.current = null;
      setUser(null);
      setBag([]);
      setWishlist([]);
      setAppliedCoupon(null);
      setIsBagOpen(false);
    }
  };

  const addToBag = async (product, selectedSize = "M") => {
    setBagError("");
    if (isAdmin) return false;
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
    if (!user || isAdmin) return;
    try {
      const { data } = await api.patch("/bag/items", { productId: id, size, delta });
      setBag(data.data?.items || []);
      await syncBagAndAutoCoupon();
    } catch (err) {
      setBagError(getApiErrorMessage(err, "Could not update quantity."));
    }
  };

  const toggleWishlist = async (productId) => {
    if (isAdmin) return;
    if (!user) {
      router.push("/account?next=wishlist");
      return;
    }
    try {
      const { data } = await api.post("/bag/wishlist/toggle", { productId });
      setWishlist(data.data?.wishlist || []);
    } catch {
      // Non-blocking wishlist toggle failure
    }
  };

  const applyCoupon = async (code) => {
    const { data } = await api.post("/coupons/validate", { code });
    const coupon = { ...data.data, applyMode: "MANUAL" };
    setAppliedCoupon(coupon);
    return coupon;
  };

  const removeCoupon = () => setAppliedCoupon(null);

  const bagCount = useMemo(() => bag.reduce((sum, item) => sum + item.quantity, 0), [bag]);
  const bagSubtotal = useMemo(
    () => bag.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [bag]
  );
  const discountInr = appliedCoupon?.discountInr || 0;

  return (
    <ShopContext.Provider
      value={{
        user,
        isAdmin,
        isSuperAdmin,
        authLoading,
        refreshSession,
        logout,
        bag,
        wishlist,
        isBagOpen: isAdmin ? false : isBagOpen,
        setIsBagOpen: (open) => {
          if (!isAdmin) setIsBagOpen(open);
        },
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
  if (!context) throw new Error("useShop must be used within a ShopProvider");
  return context;
};