export type OrderStatus =
  | "PENDING"
  | "CLAIMED"
  | "PLACED"
  | "PICKED_UP"
  | "COMPLETED";

export type UserRole = "requester" | "fulfiller";

export type UserDoc = {
  _id: string;
  name: string;
  sbuEmail: string;
  roles: UserRole[];
  venmoHandle: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type OrderDoc = {
  _id: string;
  requesterId: string;
  fulfillerId: string | null;
  location: string;
  orderDetails: string;
  originalPrice: number;
  discountPercent: number;
  discountedPrice: number;
  status: OrderStatus;
  pickupWindow: string;
  proofType: "ORDER_NUMBER";
  proofValue: string;
  paymentMethod: "VENMO";
  paymentConfirmedByRequester: boolean;
  createdAt: string;
  claimedAt: string | null;
  placedAt: string | null;
  pickedUpAt: string | null;
  completedAt: string | null;
  updatedAt: string;
};
