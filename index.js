const API = (() => {
  const URL = "http://localhost:3000";
  const getCart = () => {
    // define your method to get cart data
    return fetch(`${URL}/cart`)
    .then((res) => res.json());
  };

  const getInventory = () => {
    // define your method to get inventory data
    return fetch (`${URL}/inventory`)
    .then((res) => res.json());
    
  };

  const addToCart = (inventoryItem) => {
    // define your method to add an item to cart
    return fetch(`${URL}/cart`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(inventory/Item),
    })
    .then((res) => res.json());
  };

  const updateCart = (id, newAmount) => {
    // define your method to update an item in cart
    return fetch(`${URL}/cart/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ quantity: newAmount }),
    }).then((res) => res.json());
  };

  const deleteFromCart = (id) => {
    // define your method to delete an item in cart
    return fetch(`${URL}/cart/${id}`, {
      method: "DELETE",
    })
    .then((res) => res.json());
  };

  const checkout = () => {
    // you don't need to add anything here
    return getCart().then((data) =>
      Promise.all(data.map((item) => deleteFromCart(item.id)))
    );
  };

  return {
    getCart,
    updateCart,
    getInventory,
    addToCart,
    deleteFromCart,
    checkout,
  };
})();

const Model = (() => {
  // implement your logic for Model
  class State {
    #onChange;
    #inventory;
    #cart;
    constructor() {
      this.#inventory = [];
      this.#cart = [];
    }
    get cart() {
      return this.#cart;
    }

    get inventory() {
      return this.#inventory;
    }

    set cart(newCart) {}
    set inventory(newInventory) {}

    subscribe(cb) {}
  }
  const {
    getCart,
    updateCart,
    getInventory,
    addToCart,
    deleteFromCart,
    checkout,
  } = API;
  return {
    State,
    getCart,
    updateCart,
    getInventory,
    addToCart,
    deleteFromCart,
    checkout,
  };
})();

const View = (() => {
  // implement your logic for View
  const inventoryList = document.querySelector(".inventory-list");
  const cartList = document.querySelector(".cart-list");
  const checkoutBtn = document.querySelector(".checkout-btn");

  const renderInventory = (inventory) => {
    inventoryList.innerHTML = "";
    inventory.forEach((item) => {
      const li = document.createElement("li");
      li.textContent = `${item.name} - ${item.price}`;
      const addBtn = document.createElement("button");
      addBtn.textContent = "+";
      addBtn.addEventListener("click", () => handleAddToCart(item));
      li.appendChild(addBtn);
      inventoryList.appendChild(li);
    });
  };
  const renderCart = (cart) => {
    cartList.innerHTML = "";
    cart.forEach((item) => {
      const li = document.createElement("li");
      li.textContent = `${item.name} - ${item.price} - Quantity: ${item.quantity}`;
      const deleteButton = document.createElement("button");
      deleteButton.textContent = "Delete";
      deleteButton.addEventListener("click", () => handleDeleteFromCart(item.id));
      li.appendChild(deleteButton);
      cartList.appendChild(li);
    });
  };

  const handleAddToCart = (item) => {
    Model.addToCart(item).then((data) => {
      // Update cart
      Model.getCart().then((cartData) => {
        renderCart(cartData);
      });
    });
  };

  const handleDeleteFromCart = (id) => {
    Model.deleteFromCart(id).then((data) => {
      // Update cart
      Model.getCart().then((cartData) => {
        renderCart(cartData);
      });
    });
  };

  checkoutBtn.addEventListener("click", () => {
    Model.checkout().then(() => {
      // Cart has been checked out
      cartList.innerHTML = ""; // Clear the cart view
    });
  });

  return {
    renderInventory,
    renderCart,
  };
})();

const Controller = ((model, view) => {
  // implement your logic for Controller
  const state = new model.State();

  const init = () => {
    // Initialize app
    model.getInventory().then((data) => {
      state.inventory = data;
      view.renderInventory(state.inventory);
    });

    model.getCart().then((data) => {
      state.cart = data;
      view.renderCart(state.cart);
    });
  };

  const bootstrap = () => {
    init();
    state.subscribe(() => {
      view.renderCart(state.cart);
    });
  };
  return {
    bootstrap,
  };
})(Model, View);

Controller.bootstrap();
