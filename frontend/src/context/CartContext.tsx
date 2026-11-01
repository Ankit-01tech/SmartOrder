import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { CartItem } from '../types';

interface CartState { items: CartItem[]; }

type CartAction =
  | { type: 'ADD'; item: Omit<CartItem, 'quantity'> }
  | { type: 'REMOVE'; id: string }
  | { type: 'UPDATE_QTY'; id: string; qty: number }
  | { type: 'CLEAR' };

const cartReducer = (state: CartState, action: CartAction): CartState => {
  switch (action.type) {
    case 'ADD': {
      const existing = state.items.find(i => i.menuItemId === action.item.menuItemId);
      if (existing) {
        return { items: state.items.map(i => i.menuItemId === action.item.menuItemId ? { ...i, quantity: i.quantity + 1 } : i) };
      }
      return { items: [...state.items, { ...action.item, quantity: 1 }] };
    }
    case 'REMOVE':
      return { items: state.items.filter(i => i.menuItemId !== action.id) };
    case 'UPDATE_QTY': {
      if (action.qty <= 0) return { items: state.items.filter(i => i.menuItemId !== action.id) };
      return { items: state.items.map(i => i.menuItemId === action.id ? { ...i, quantity: action.qty } : i) };
    }
    case 'CLEAR':
      return { items: [] };
    default:
      return state;
  }
};

interface CartContextType {
  state: CartState;
  dispatch: React.Dispatch<CartAction>;
  total: number;
  itemCount: number;
  maxPrepTime: number;
}

const CartContext = createContext<CartContextType>({} as CartContextType);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(cartReducer, { items: [] });
  const total       = state.items.reduce((s, i) => s + i.price * i.quantity, 0);
  const itemCount   = state.items.reduce((s, i) => s + i.quantity, 0);
  const maxPrepTime = state.items.length ? Math.max(...state.items.map(i => i.prepTime)) : 0;

  return (
    <CartContext.Provider value={{ state, dispatch, total, itemCount, maxPrepTime }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
