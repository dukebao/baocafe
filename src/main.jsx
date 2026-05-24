import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Check,
  ChevronLeft,
  Clock,
  Coffee,
  History,
  ListChecks,
  Plus,
  ReceiptText,
  Send,
  ShoppingBag,
  Trash2,
  X
} from "lucide-react";
import { supabase, supabaseReady } from "./supabase";
import { menuSections, milkOptions, syrupOptions, toppingOptions } from "./menu";
import "./styles.css";

const routes = {
  "/order": "order",
  "/barista": "barista",
  "/admin": "admin"
};

function getRoute() {
  return routes[window.location.pathname] || "order";
}

function formatPickupTime(value) {
  if (!value) return "ASAP";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatCreatedAt(value) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function makeClientId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `item-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function makeOrderItem(drink, options) {
  return {
    id: makeClientId(),
    drink: drink.name,
    category: drink.category,
    milk: options.milk,
    temperature: options.temperature,
    syrups: options.syrups,
    toppings: options.toppings,
    note: options.note.trim()
  };
}

function App() {
  const [route, setRoute] = useState(getRoute);

  useEffect(() => {
    const onPopState = () => setRoute(getRoute());
    window.addEventListener("popstate", onPopState);

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  return (
    <main className="app-shell">
      <div className="board app-board">
        <div className="board-inner app-inner">
          {route === "barista" && <BaristaView />}
          {route === "admin" && <AdminView />}
          {route === "order" && <OrderView />}
        </div>
      </div>
    </main>
  );
}

function AppHeader({ eyebrow, title, children }) {
  return (
    <header className="app-header">
      <p>{eyebrow}</p>
      <h1>{title}</h1>
      {children}
    </header>
  );
}

function SetupWarning() {
  if (supabaseReady) return null;

  return (
    <div className="notice">
      Supabase is not configured for this build. Add public Supabase env values
      and restart the dev server.
    </div>
  );
}

function OrderView() {
  const [selectedCategory, setSelectedCategory] = useState(menuSections[0].name);
  const [selectedDrink, setSelectedDrink] = useState(null);
  const [cart, setCart] = useState([]);
  const [customerName, setCustomerName] = useState("");
  const [pickupTime, setPickupTime] = useState("");
  const [orderNote, setOrderNote] = useState("");
  const [cartOpen, setCartOpen] = useState(false);
  const [submitState, setSubmitState] = useState({ status: "idle", message: "" });

  const drinks = useMemo(
    () => menuSections.find((section) => section.name === selectedCategory)?.items || [],
    [selectedCategory]
  );

  async function submitOrder(event) {
    event.preventDefault();
    if (!cart.length) {
      setSubmitState({ status: "error", message: "Add at least one drink first." });
      return;
    }

    if (!customerName.trim()) {
      setSubmitState({ status: "error", message: "Add your name so Bao knows who ordered." });
      return;
    }

    setSubmitState({ status: "loading", message: "Sending your order..." });
    const payload = {
      customer_name: customerName.trim(),
      requested_at: pickupTime ? new Date(pickupTime).toISOString() : null,
      status: "pending",
      items: cart.map(({ id, ...item }) => item),
      order_note: orderNote.trim() || null
    };

    const { error } = await supabase.from("orders").insert(payload);
    if (error) {
      setSubmitState({ status: "error", message: error.message });
      return;
    }

    setCart([]);
    setCustomerName("");
    setPickupTime("");
    setOrderNote("");
    setSelectedDrink(null);
    setCartOpen(false);
    setSubmitState({ status: "success", message: "Order sent. Bao has your drink queue now." });
  }

  return (
    <>
      <AppHeader eyebrow="Aria's Cafe" title="Order Drinks">
        <div className="route-actions">
          <a className="quiet-link" href="/">Menu</a>
          <a className="quiet-link" href="/barista">Barista</a>
        </div>
      </AppHeader>

      <SetupWarning />
      {submitState.status === "success" && (
        <p className="form-message success order-success">{submitState.message}</p>
      )}

      <div className="order-layout">
        <section className="menu-panel" aria-label="Drink menu">
          <div className="mobile-cart-row">
            <button
              className="quiet-button"
              type="button"
              onClick={() => setCartOpen(true)}
              disabled={cart.length === 0}
            >
              <ShoppingBag size={17} aria-hidden="true" />
              {cart.length} {cart.length === 1 ? "drink" : "drinks"}
            </button>
          </div>

          <div className="tabs" role="tablist" aria-label="Drink categories">
            {menuSections.map((section) => (
              <button
                key={section.name}
                className={section.name === selectedCategory ? "tab active" : "tab"}
                onClick={() => setSelectedCategory(section.name)}
                type="button"
              >
                {section.name}
              </button>
            ))}
          </div>

          <div className="drink-list">
            {drinks.map((drink) => (
              <button
                key={`${drink.category}-${drink.name}`}
                className="drink-row"
                onClick={() => setSelectedDrink(drink)}
                type="button"
              >
                <span>
                  <strong>{drink.name}</strong>
                  <small>{drink.desc}</small>
                </span>
                <Plus size={18} aria-hidden="true" />
              </button>
            ))}
          </div>
        </section>
      </div>

      {selectedDrink && (
        <DrinkCustomizer
          drink={selectedDrink}
          onClose={() => setSelectedDrink(null)}
          onAdd={(options) => {
            setCart((current) => [...current, makeOrderItem(selectedDrink, options)]);
            setSelectedDrink(null);
            setCartOpen(true);
            setSubmitState({ status: "idle", message: "" });
          }}
        />
      )}

      {cartOpen && (
        <CartReview
          cart={cart}
          customerName={customerName}
          pickupTime={pickupTime}
          orderNote={orderNote}
          submitState={submitState}
          onAddAnother={() => {
            setCartOpen(false);
            setSubmitState({ status: "idle", message: "" });
          }}
          onClose={() => setCartOpen(false)}
          onRemove={(id) => setCart((current) => current.filter((cartItem) => cartItem.id !== id))}
          onSubmit={submitOrder}
          setCustomerName={setCustomerName}
          setPickupTime={setPickupTime}
          setOrderNote={setOrderNote}
        />
      )}
    </>
  );
}

function CartReview({
  cart,
  customerName,
  pickupTime,
  orderNote,
  submitState,
  onAddAnother,
  onClose,
  onRemove,
  onSubmit,
  setCustomerName,
  setPickupTime,
  setOrderNote
}) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="cart-title">
      <section className="cart-review">
        <div className="cart-review-header">
          <button className="back-button" type="button" onClick={onAddAnother}>
            <ChevronLeft size={18} aria-hidden="true" />
            Add Another
          </button>
          <button className="icon-button" type="button" aria-label="Close order review" onClick={onClose}>
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="panel-title">
          <ShoppingBag size={20} aria-hidden="true" />
          <h2 id="cart-title">Your Order</h2>
        </div>

        {cart.length === 0 ? (
          <p className="empty-state">Choose a drink to start an order.</p>
        ) : (
          <div className="cart-list">
            {cart.map((item) => (
              <article className="cart-item" key={item.id}>
                <div>
                  <strong>{item.drink}</strong>
                  <small>
                    {item.temperature} · {item.milk}
                  </small>
                  <ItemOptions item={item} />
                  {item.note && <p>{item.note}</p>}
                </div>
                <button
                  className="icon-button"
                  type="button"
                  aria-label={`Remove ${item.drink}`}
                  onClick={() => onRemove(item.id)}
                >
                  <Trash2 size={18} aria-hidden="true" />
                </button>
              </article>
            ))}
          </div>
        )}

        <form className="checkout-form" onSubmit={onSubmit}>
          <label>
            <span>Your name</span>
            <input
              value={customerName}
              onChange={(event) => setCustomerName(event.target.value)}
              placeholder="Friend name"
            />
          </label>

          <label>
            <span>Pickup time</span>
            <input
              type="datetime-local"
              value={pickupTime}
              onChange={(event) => setPickupTime(event.target.value)}
            />
            <small>Leave blank for ASAP.</small>
          </label>

          <label>
            <span>Order note</span>
            <textarea
              value={orderNote}
              onChange={(event) => setOrderNote(event.target.value)}
              placeholder="Anything Bao should know about the whole order?"
            />
          </label>

          {submitState.message && submitState.status !== "success" && (
            <p className={`form-message ${submitState.status}`}>{submitState.message}</p>
          )}

          <div className="cart-review-actions">
            <button className="quiet-button" type="button" onClick={onAddAnother}>
              <Plus size={17} aria-hidden="true" />
              Add Another Drink
            </button>
            <button className="primary-button" type="submit" disabled={submitState.status === "loading"}>
              <Send size={18} aria-hidden="true" />
              {submitState.status === "loading" ? "Sending" : "Place Order"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function DrinkCustomizer({ drink, onAdd, onClose }) {
  const [temperature, setTemperature] = useState(drink.defaultTemperature || "hot");
  const [milk, setMilk] = useState(milkOptions[0]);
  const [syrups, setSyrups] = useState([]);
  const [toppings, setToppings] = useState([]);
  const [note, setNote] = useState("");

  function toggleOption(value, setter) {
    setter((current) =>
      current.includes(value)
        ? current.filter((option) => option !== value)
        : [...current, value]
    );
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="customizer-title">
      <section className="customizer">
        <button className="back-button" type="button" onClick={onClose}>
          <ChevronLeft size={18} aria-hidden="true" />
          Back
        </button>

        <div className="drink-detail">
          <div className="cup-mark" aria-hidden="true">
            <Coffee size={34} />
          </div>
          <p>{drink.category}</p>
          <h2 id="customizer-title">{drink.name}</h2>
          <span>{drink.desc}</span>
        </div>

        <fieldset>
          <legend>Temperature</legend>
          <div className="segmented">
            {["hot", "iced"].map((option) => (
              <button
                key={option}
                className={temperature === option ? "segment active" : "segment"}
                onClick={() => setTemperature(option)}
                type="button"
              >
                {option}
              </button>
            ))}
          </div>
        </fieldset>

        <label>
          <span>Milk</span>
          <select value={milk} onChange={(event) => setMilk(event.target.value)}>
            {milkOptions.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </label>

        <MultiSelectDropdown
          label="Syrups"
          options={syrupOptions}
          selected={syrups}
          onToggle={(option) => toggleOption(option, setSyrups)}
        />

        <MultiSelectDropdown
          label="Toppings"
          options={toppingOptions}
          selected={toppings}
          onToggle={(option) => toggleOption(option, setToppings)}
        />

        <label>
          <span>Customizations</span>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Syrup, sweetness, less ice, toppings, make it chaotic..."
          />
        </label>

        <button
          className="primary-button"
          type="button"
          onClick={() => onAdd({ temperature, milk, syrups, toppings, note })}
        >
          <Plus size={18} aria-hidden="true" />
          Add Drink
        </button>
      </section>
    </div>
  );
}

function MultiSelectDropdown({ label, options, selected, onToggle }) {
  const summary = selected.length ? selected.join(", ") : "None selected";

  return (
    <details className="multi-select">
      <summary>
        <span>{label}</span>
        <small>{summary}</small>
      </summary>

      <div className="multi-select-options">
        {options.map((option) => (
          <label className="check-option" key={option}>
            <span>{option}</span>
            <input
              checked={selected.includes(option)}
              onChange={() => onToggle(option)}
              type="checkbox"
            />
          </label>
        ))}
      </div>
    </details>
  );
}

function BaristaView() {
  const { orders, loading, message, markDone, refresh } = useOrders("pending");

  return (
    <>
      <AppHeader eyebrow="Aria's Cafe" title="Barista Queue">
        <div className="route-actions">
          <a className="quiet-link" href="/order">Order</a>
          <a className="quiet-link" href="/admin">Admin</a>
        </div>
      </AppHeader>
      <SetupWarning />
      <OrderBoard
        emptyText="No pending drinks right now."
        loading={loading}
        message={message}
        orders={orders}
        onRefresh={refresh}
        actions={(order) => (
          <button className="done-button" type="button" onClick={() => markDone(order.id)}>
            <Check size={18} aria-hidden="true" />
            Done
          </button>
        )}
      />
    </>
  );
}

function AdminView() {
  const [status, setStatus] = useState("all");
  const { orders, loading, message, refresh } = useOrders(status);

  return (
    <>
      <AppHeader eyebrow="Aria's Cafe" title="Order History">
        <div className="route-actions">
          <a className="quiet-link" href="/order">Order</a>
          <a className="quiet-link" href="/barista">Barista</a>
        </div>
      </AppHeader>
      <SetupWarning />
      <div className="admin-filter">
        {["all", "pending", "done"].map((option) => (
          <button
            key={option}
            className={status === option ? "filter-button active" : "filter-button"}
            onClick={() => setStatus(option)}
            type="button"
          >
            {option}
          </button>
        ))}
      </div>
      <OrderBoard
        emptyText="No orders found."
        loading={loading}
        message={message}
        orders={orders}
        onRefresh={refresh}
        actions={(order) => <StatusBadge status={order.status} />}
      />
    </>
  );
}

function useOrders(statusFilter) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function refresh() {
    setLoading(true);
    let query = supabase
      .from("orders")
      .select("*")
      .order("requested_at", { ascending: true, nullsFirst: true })
      .order("created_at", { ascending: true });

    if (statusFilter !== "all") {
      query = query.eq("status", statusFilter);
    }

    const { data, error } = await query;
    if (error) {
      setMessage(error.message);
      setOrders([]);
    } else {
      setMessage("");
      setOrders(data || []);
    }
    setLoading(false);
  }

  async function markDone(orderId) {
    const { error } = await supabase
      .from("orders")
      .update({
        status: "done",
        completed_at: new Date().toISOString()
      })
      .eq("id", orderId);

    if (error) {
      setMessage(error.message);
      return;
    }

    setOrders((current) => current.filter((order) => order.id !== orderId));
  }

  useEffect(() => {
    refresh();
    const channel = supabase
      .channel(`orders-${statusFilter}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, refresh)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [statusFilter]);

  return { orders, loading, message, markDone, refresh };
}

function OrderBoard({ orders, loading, message, actions, emptyText, onRefresh }) {
  return (
    <section className="orders-panel">
      <div className="board-toolbar">
        <div>
          <ListChecks size={20} aria-hidden="true" />
          <span>{orders.length} orders</span>
        </div>
        <button className="quiet-button" type="button" onClick={onRefresh}>
          <History size={17} aria-hidden="true" />
          Refresh
        </button>
      </div>

      {message && <p className="form-message error">{message}</p>}
      {loading && <p className="empty-state">Loading orders...</p>}
      {!loading && !orders.length && <p className="empty-state">{emptyText}</p>}

      <div className="orders-list">
        {orders.map((order) => (
          <article className="order-card" key={order.id}>
            <div className="order-card-header">
              <div>
                <strong>{order.customer_name}</strong>
                <span>
                  <Clock size={15} aria-hidden="true" />
                  {formatPickupTime(order.requested_at)}
                </span>
              </div>
              {actions(order)}
            </div>

            <ol className="order-items">
              {(order.items || []).map((item, index) => (
                <li key={`${order.id}-${index}`}>
                  <div>
                    <strong>{item.drink}</strong>
                    <small>
                      {item.temperature} · {item.milk}
                    </small>
                    <ItemOptions item={item} />
                  </div>
                  {item.note && <p>{item.note}</p>}
                </li>
              ))}
            </ol>

            {order.order_note && (
              <p className="order-note">
                <ReceiptText size={16} aria-hidden="true" />
                {order.order_note}
              </p>
            )}

            <footer>Placed {formatCreatedAt(order.created_at)}</footer>
          </article>
        ))}
      </div>
    </section>
  );
}

function StatusBadge({ status }) {
  return <span className={`status-badge ${status}`}>{status}</span>;
}

function ItemOptions({ item }) {
  const lines = [];

  if (item.syrups?.length) {
    lines.push(`Syrups: ${item.syrups.join(", ")}`);
  }

  if (item.toppings?.length) {
    lines.push(`Toppings: ${item.toppings.join(", ")}`);
  }

  if (!lines.length) return null;

  return (
    <div className="item-options">
      {lines.map((line) => (
        <span key={line}>{line}</span>
      ))}
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
