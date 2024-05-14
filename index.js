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
    #currentPage = 1;
    #itemsPerPage = 3;

    get cart() { 
      return this.#cart; 
    }

    set cart(newCart) {
      this.#cart = newCart;
      this.#onChange.forEach(cb => cb());
    }

    get inventory() { 
      return this.#inventory.slice((this.#currentPage - 1) * this.#itemsPerPage, this.#currentPage * this.#itemsPerPage); 
    }

    set inventory(newInventory) {
      this.#inventory = newInventory;
      this.#onChange.forEach(cb => cb());
    }

    get currentPage() { 
      return this.#currentPage; 
    }
    set currentPage(newPage) {
      this.#currentPage = newPage;
      this.#onChange.forEach(cb => cb());
    }

    get totalPages() { 
      return Math.ceil(this.#inventory.length / this.#itemsPerPage); 
    }

    subscribe(cb) { 
      this.#onChange.push(cb); 
    }
  }

  return new State();
})();

const View = (() => {
  const inventoryList = document.querySelector(".inventory-list");
  const cartList = document.querySelector(".cart-list");
  const checkoutBtn = document.querySelector(".checkout-btn");
  const paginationContainer = document.querySelector(".inventory__pagination-pages");
  const prevBtn = document.querySelector(".inventory__prev-btn");
  const nextBtn = document.querySelector(".inventory__next-btn");

  const renderInventory = (inventory, totalPages, currentPage) => {
    inventoryList.innerHTML = inventory.map(item => `
      <li>
        ${item.content} 
        <button onclick="Controller.handleUpdateQuantity(${item.id}, -1)">-</button>
        <span id="qty-${item.id}">0</span>
        <button onclick="Controller.handleUpdateQuantity(${item.id}, 1)">+</button>
        <button onclick="Controller.handleAddToCart(${item.id})">Add to Cart</button>
      </li>
    `).join('');

    paginationContainer.innerHTML = Array.from({ length: totalPages }, (_, i) => `
      <button class="${i + 1 === currentPage ? 'active' : ''}" onclick="Controller.handleChangePage(${i + 1})">${i + 1}</button>
    `).join('');
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages;
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
  const init = () => {
    API.getInventory().then(data => {
      model.inventory = data;
      view.renderInventory(model.inventory, model.totalPages, model.currentPage);
    });

    API.getCart().then(data => {
      model.cart = data;
      view.renderCart(model.cart);
    });
  };

  const handleChangePage = (newPage) => {
    model.currentPage = newPage;
    view.renderInventory(model.inventory, model.totalPages, model.currentPage);
  };

  const handleUpdateQuantity = (id, delta) => {
    const qtyElem = document.getElementById(`qty-${id}`);
    const quantity = Math.max(0, parseInt(qtyElem.textContent) + delta);
    qtyElem.textContent = quantity;
  };

  const handleAddToCart = (id) => {
    const qtyElem = document.getElementById(`qty-${id}`);
    const quantity = parseInt(qtyElem.textContent);
    if (quantity > 0) {
      const item = model.inventory.find(item => item.id === id);
      const cartItem = model.cart.find(ci => ci.id === id);

      if (cartItem) {
        cartItem.quantity += quantity;
        API.updateCart(id, cartItem).then(updatedItem => {
          model.cart = model.cart.map(ci => ci.id === id ? updatedItem : ci);
          view.renderCart(model.cart);
        });
      } else {
        const newItem = {...item, quantity};
        API.addToCart(newItem).then(addedItem => {
          model.cart = [...model.cart, addedItem];
          view.renderCart(model.cart);
        });
      }
      qtyElem.textContent = '0'; // Reset the quantity after adding to cart
    }
  };

  const handleDeleteFromCart = (id) => {
    API.deleteFromCart(id).then(() => {
      model.cart = model.cart.filter(item => item.id !== id);
      view.renderCart(model.cart);
    });
  };

  const handleCheckout = () => {
    API.checkout().then(() => {
      model.cart = []; // Clear the cart in the model
      view.renderCart(model.cart); // Update the view to show an empty cart
    }).catch(error => {
      console.error('error', error);
      alert('Checkout failed, try again.');
    });
  };

  model.subscribe(() => {
    view.renderInventory(model.inventory, model.totalPages, model.currentPage);
    view.renderCart(model.cart);
  });

  return { init, handleUpdateQuantity, handleAddToCart, handleDeleteFromCart, handleChangePage, handleCheckout };
})(Model, View);

document.addEventListener("DOMContentLoaded", () => {
  Controller.init();
  document.querySelector(".checkout-btn").addEventListener("click", Controller.handleCheckout);
  document.querySelector(".inventory__prev-btn").addEventListener("click", () => Controller.handleChangePage(Model.currentPage - 1));
  document.querySelector(".inventory__next-btn").addEventListener("click", () => Controller.handleChangePage(Model.currentPage + 1));
});