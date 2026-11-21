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
import { useToast } from "@/context/ToastContext";

const ShopContext = createContext(null);

// Module-level in-flight locks prevent duplicate /auth/me & /bag calls under React StrictMode or simultaneous mounts
let inFlightMePromise = null;
let inFlightBagPromise = null;

export function ShopProvider({ children }) {
  const router = useRouter();
  const toast = useToast();

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

  useEffect(() => {
    if (!bagError) return;
    const t = setTimeout(() => setBagError(""), 5000);
    return () => clearTimeout(t);
  }, [bagError]);

  const isAdmin = user?.role === "admin" || user?.role === "super_admin";
  const isSuperAdmin =
    user?.role === "super_admin" && user?.email?.toLowerCase() === "admin@divara.com";

  const syncBagAndAutoCoupon = useCallback(async (roleOverride = null) => {
    const role = roleOverride || userRoleRef.current;
    if (role === "admin" || role === "super_admin") {
      setBag([]);
      setWishlist([]);
      setAppliedCoupon(null);
      return [];
    }

    if (!inFlightBagPromise) {
      inFlightBagPromise = (async () => {
        try {
          const { data: bagRes } = await api.get("/bag");
          const items = bagRes.data?.items || [];
          const wl = bagRes.data?.wishlist || [];

          let nextCoupon = null;
          if (items.length > 0) {
            const currentCoupon = appliedCouponRef.current;
            if (currentCoupon && currentCoupon.applyMode === "MANUAL" && currentCoupon.code) {
              try {
                const { data: revalRes } = await api.post("/coupons/validate", {
                  code: currentCoupon.code,
                });
                nextCoupon = { ...revalRes.data, applyMode: "MANUAL" };
              } catch {
                nextCoupon = null;
              }
            }
            if (!nextCoupon) {
              const { data: autoRes } = await api.get("/coupons/auto");
              nextCoupon = autoRes.data?.coupon || null;
            }
          }

          return { items, wishlist: wl, coupon: nextCoupon };
        } catch {
          return { items: [], wishlist: [], coupon: null };
        } finally {
          inFlightBagPromise = null;
        }
      })();
    }

    const result = await inFlightBagPromise;
    setBag(result.items);
    setWishlist(result.wishlist);
    setAppliedCoupon(result.coupon);
    return result.items;
  }, []);

  const refreshSession = useCallback(async () => {
    setAuthLoading(true);
    try {
      if (!inFlightMePromise) {
        inFlightMePromise = api
          .get("/auth/me")
          .then(({ data }) => data.data?.user || null)
          .catch(() => null)
          .finally(() => {
            inFlightMePromise = null;
          });
      }

      const fetchedUser = await inFlightMePromise;
      userRoleRef.current = fetchedUser?.role || null;
      setUser(fetchedUser);

      if (fetchedUser) {
        await syncBagAndAutoCoupon(fetchedUser.role);
      } else {
        setBag([]);
        setWishlist([]);
        setAppliedCoupon(null);
      }
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

  const addToBag = async (product, selectedSize = "M", quantity = 1) => {
    setBagError("");
    if (isAdmin) return false;
    if (!user) {
      toast.info("Please sign in to add garments to your bag.");
      router.push("/account?next=bag");
      return false;
    }

    const safeQty = Math.max(1, Math.min(10, Math.floor(Number(quantity) || 1)));

    try {
      const { data } = await api.post("/bag/items", {
        productId: product.slug || product.id,
        size: selectedSize,
        quantity: safeQty,
      });
      const payload = data.data || {};
      setBag(payload.items || []);
      setIsBagOpen(true);
      if (payload.clamped && payload.message) {
        toast.warning(payload.message);
      } else {
        toast.success(`Added ${product.title} (${selectedSize}) × ${safeQty} to bag.`);
      }
      await syncBagAndAutoCoupon();
      return { ok: true, ...payload };
    } catch (err) {
      const msg = getApiErrorMessage(err, "Could not add item to bag.");
      setBagError(msg);
      toast.error(msg);
      return { ok: false, error: msg };
    }
  };

  const setItemQuantity = async (id, size, quantity, signal) => {
    setBagError("");
    if (!user || isAdmin) return null;
    try {
      const { data } = await api.patch(
        "/bag/items",
        { productId: id, size, quantity },
        signal ? { signal } : undefined
      );
      const payload = data.data || {};
      setBag(payload.items || []);
      if (payload.clamped && payload.message) {
        toast.warning(payload.message);
      }
      await syncBagAndAutoCoupon();
      return payload;
    } catch (err) {
      if (err?.name === "CanceledError" || err?.code === "ERR_CANCELED") {
        return null;
      }
      const msg = getApiErrorMessage(err, "Could not update quantity.");
      setBagError(msg);
      toast.error(msg);
      await syncBagAndAutoCoupon();
      return null;
    }
  };

  const updateQuantity = async (id, size, delta) => {
    setBagError("");
    if (!user || isAdmin) return null;
    try {
      const { data } = await api.patch("/bag/items", { productId: id, size, delta });
      const payload = data.data || {};
      setBag(payload.items || []);
      if (payload.clamped && payload.message) {
        toast.warning(payload.message);
      }
      await syncBagAndAutoCoupon();
      return payload;
    } catch (err) {
      const msg = getApiErrorMessage(err, "Could not update quantity.");
      setBagError(msg);
      toast.error(msg);
      return null;
    }
  };

  const toggleWishlist = async (productId) => {
    if (isAdmin) return;
    if (!user) {
      toast.info("Please sign in to save garments to your wishlist.");
      router.push("/account?next=wishlist");
      return;
    }
    try {
      const { data } = await api.post("/bag/wishlist/toggle", { productId });
      setWishlist(data.data?.wishlist || []);
    } catch {
      toast.error("Could not update wishlist right now.");
    }
  };

  const applyCoupon = async (code) => {
    const { data } = await api.post("/coupons/validate", { code });
    const coupon = { ...data.data, applyMode: "MANUAL" };
    setAppliedCoupon(coupon);
    toast.success(`Coupon ${coupon.code} applied.`);
    return coupon;
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    toast.info("Coupon removed.");
  };

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
        setItemQuantity,
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