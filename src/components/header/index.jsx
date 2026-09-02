import { useRef, useEffect, useState } from "react";
import "./header.style.css";
import { Button } from "../componentsTag/button";
import { HomeIcon } from "../componentsTag/icon/homeIcon";
import { RankingIcon } from "../componentsTag/icon/rankingIcon";
import Logo from "../componentsTag/icon/logo";

export function Header({ activeTab = "inicio", onSelect }) {
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });

  const containerRef = useRef(null);
  const buttonsRef = useRef({});

  const menuItems = [
    { id: "inicio", texto: "Inicio", icone: <HomeIcon /> },
    { id: "ranking", texto: "Ranking", icone: <RankingIcon /> },
  ];

  useEffect(() => {
    const activeBtn = buttonsRef.current[activeTab];
    const container = containerRef.current;

    if (activeBtn && container) {
      const { offsetLeft, offsetWidth } = activeBtn;
      setIndicatorStyle({ left: offsetLeft, width: offsetWidth });
      return;
    }

    setIndicatorStyle({ left: 0, width: 0 });
  }, [activeTab]);

  return (
    <header className={`header-main`}>
      <section className="sectionLogo">
        <a href="/">
          <Logo className="logo" />
        </a>
      </section>
      <section className="sectionBtn" ref={containerRef}>
        {menuItems.map((item) => (
          <div
            key={item.id}
            ref={(el) => (buttonsRef.current[item.id] = el)}
            style={{ display: "inline-block" }}
          >
            <Button
              classe={`botao ${activeTab === item.id ? "active" : ""}`}
              icone={item.icone}
              classeTexto="textoBotao"
              texto={item.texto}
              onClick={() => onSelect?.(item.id)}
            />
          </div>
        ))}

        <div
          className="sombra-neon-deslizante"
          style={{
            transform: `translateX(${indicatorStyle.left}px)`,
            width: `${indicatorStyle.width}px`,
          }}
        />
      </section>

      <section className="barraSombra"></section>
    </header>
  );
}
