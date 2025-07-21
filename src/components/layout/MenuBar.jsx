
import { HamburgerIcon } from "./HambergerIcon";
import { useState, useEffect } from "react";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { auth } from "../../services/firebase";
import { useNavigate } from "react-router-dom";

const baseMenuList = [
  { name: "Home", icon: "home" },
];

export default function MenuBar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsLoggedIn(!!user);
    });
    return () => unsubscribe();
  }, []);

  const menuList = isLoggedIn
    ? [...baseMenuList, { name: "Logout", icon: "logout" }]
    : [...baseMenuList, { name: "Login", icon: "login" }];

  const handleMenuClick = async (item) => {
    if (item.name === "Login") {
      navigate("/login");
    } else if (item.name === "Logout") {
      await signOut(auth);
      navigate("/login");
    }
  };

  return (
    <div className={`relative ${isOpen ? "bg-white shadow-lg rounded-lg transition-all" : ""}`}>
      <button
        type="button"
        className={`p-2 focus:outline-none cursor-pointer absolute top-2 right-2 z-10 bg-white rounded-full shadow-md transition-transform duration-300 ${isOpen ? "rotate-90" : ""}`}
        aria-label={isOpen ? "Close menu" : "Open menu"}
        onClick={() => setIsOpen((prev) => !prev)}
        style={{ background: "none", border: "none" }}
      >
        {isOpen ? "✕" : <HamburgerIcon />}
      </button>
      <ul
        className={`menu-list transition-all duration-300 ease-in-out ${isOpen ? "opacity-100 translate-y-0 pointer-events-auto py-2 px-4 mt-2" : "opacity-0 -translate-y-4 pointer-events-none"}`}
        style={{ minWidth: "160px" }}
      >
        {menuList.map((item) => (
          <li
            key={item.name}
            className="flex items-center gap-3 py-2 px-3 rounded-md cursor-pointer hover:bg-blue-100 hover:text-blue-700 transition-colors duration-200"
            style={{ fontWeight: 500, fontSize: "1rem" }}
            onClick={() => handleMenuClick(item)}
          >
            <span
              className={`icon-${item.icon}`}
              style={{ fontSize: "1.2em", marginRight: "8px" }}
            />
            {item.name}
          </li>
        ))}
      </ul>
    </div>
  );
}