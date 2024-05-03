const API = (() => {
  const URL = "http://localhost:3000";

  const getCart = () => fetch(`${URL}/cart`)
  .then(res => res.json());

  const getInventory = () => fetch(`${URL}/inventory`)
  .then(res => res.json());

  const addToCart = (item) => fetch(`${URL}/cart`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(item)
  })
  .then(res => res.json());

  const updateCart = (id, item) => fetch(`${URL}/cart/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(item)
  })
  .then(res => res.json());

  const deleteFromCart = (id) => fetch(`${URL}/cart/${id}`, {
    method: "DELETE"
  })
  .then(res => res.json());

  const checkout = () => getCart().then(data => 
    Promise.all(data.map(item => deleteFromCart(item.id)))
  );

  return { getCart, getInventory, addToCart, updateCart, deleteFromCart, checkout };
})();

const Model = (() => {
  class State {
    #onChange = [];
    #inventory = [];
    #cart = [];

    get cart() { return this.#cart; }
    set cart(newCart) {
      this.#cart = newCart;
      this.#onChange.forEach(cb => cb());
    }

    get inventory() { return this.#inventory; }
    set inventory(newInventory) {
      this.#inventory = newInventory;
      this.#onChange.forEach(cb => cb());
    }

    subscribe(cb) { this.#onChange.push(cb); }
  }

  return new State();
})();

const View = (() => {
  const inventoryList = document.querySelector(".inventory-list");
  const cartList = document.querySelector(".cart-list");
  const checkoutBtn = document.querySelector(".checkout-btn");

  const renderInventory = (inventory) => {
    inventoryList.innerHTML = inventory.map(item => `
      <li>
        ${item.content} 
        <button onclick="Controller.handleUpdateQuantity(${item.id}, -1)">-</button>
        <span id="qty-${item.id}">0</span>
        <button onclick="Controller.handleUpdateQuantity(${item.id}, 1)">+</button>
        <button onclick="Controller.handleAddToCart(${item.id})">Add to Cart</button>
      </li>
    `).join('');
  };

  const renderCart = (cart) => {
    cartList.innerHTML = cart.map(item => `
      <li>${item.content} x ${item.quantity} 
        <button onclick="Controller.handleDeleteFromCart(${item.id})">Delete</button>
      </li>
    `).join('');
  };

  return { renderInventory, renderCart };
})();

const Controller = ((model, view) => {
  const quantities = {};

  const init = () => {
    API.getInventory().then(data => {
      model.inventory = data;
      data.forEach(item => { quantities[item.id] = 0; });
      view.renderInventory(model.inventory);
    });

    API.getCart().then(data => {
      model.cart = data;
      view.renderCart(model.cart);
    });
  };

  const handleUpdateQuantity = (id, delta) => {
    const qtyElem = document.getElementById(`qty-${id}`);
    quantities[id] = Math.max(0, quantities[id] + delta);
    qtyElem.textContent = quantities[id];
  };

  const handleAddToCart = (id) => {
    const quantity = quantities[id];
    if (quantity > 0) {
      const item = model.inventory.find(item => item.id === id);
      const cartItem = model.cart.find(ci => ci.id === id);
      if (cartItem) {
        cartItem.quantity += quantity;
        API.updateCart(id, cartItem).then(() => {
          API.getCart().then(view.renderCart);
        });
      } else {
        const newItem = {...item, quantity};
        API.addToCart(newItem).then(() => {
          API.getCart().then(view.renderCart);
        });
      }
      quantities[id] = 0; // Reset the quantity after adding to cart
      document.getElementById(`qty-${id}`).textContent = '0';
    }
  };

  const handleDeleteFromCart = (id) => {
    API.deleteFromCart(id).then(() => {
      API.getCart().then(view.renderCart);
    });
  };

  const handleCheckout = () => {
    API.checkout().then(() => {
      API.getCart().then(view.renderCart); // Refresh the cart view post-checkout
    });
  };

  model.subscribe(() => {
    view.renderInventory(model.inventory);
    view.renderCart(model.cart);
  });

  return { init, handleUpdateQuantity, handleAddToCart, handleDeleteFromCart, handleCheckout };
})(Model, View);

document.addEventListener("DOMContentLoaded", () => {
  Controller.init();
  document.querySelector(".checkout-btn").addEventListener("click", Controller.handleCheckout);
});

