import { useEffect, useState, useRef } from "react";
import MemoryGame from "../components/jogos/JogodaMemoria/MemoryGame";
import HangmanGame from "../components/jogos/ForcaGame/HangmanGame";
import LabirintoGame from "../components/jogos/labirintoGame/LabirintoGame";
import QuizGame from "../components/jogos/quizGame/QuizGame";
import CatchGame from "../components/jogos/CestaDeItensGame/CatchGame";
import WhacGame from "../components/jogos/AperteOPasso/WhacGame";
import WordSearchGame from "../components/jogos/CacaPalavrasGame/WordSearchGame";
import SoletraGame from "../components/jogos/soletraGame/SoletraGame";
import { HeaderJogo } from "../components/headerJogo/HeaderJogo";
import { getGameContent, getRanking, saveGameScore, getGameRulesVersion } from "../lib/appDatabase";
import { buildGameConfig } from "../utils/gameConfig";

export function Jogos({
  player = {},
  selectedGame = {},
  onBackToMenu,
  onBackToCadastro,
}) {
  const [gameState, setGameState] = useState({});
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const gameCode = selectedGame.code ?? "memory";

        // Carrega conteúdo e ranking em paralelo
        
        let content = null;
        switch (gameCode) {
          case "memory": content = (await import('../data/memory.json')).default; break;
          case "hangman": content = (await import('../data/hangman.json')).default; break;
          case "labirinto": content = (await import('../data/labirinto.json')).default; break;
          case "quiz": content = (await import('../data/quiz.json')).default; break;
          case "catch": content = (await import('../data/catch.json')).default; break;
          case "whac": content = (await import('../data/whac.json')).default; break;
          case "wordsearch": content = (await import('../data/wordsearch.json')).default; break;
          case "soletra": content = (await import('../data/soletra.json')).default; break;
          default:
            content = await getGameContent(gameCode).catch((e) => {
              console.error("Erro getGameContent:", e);
              return null;
            });
        }
        
        const remoteRanking = await getRanking().catch(() => []);


        if (!active) return;

        // Estrutura dados específicos para cada jogo
        const structuredData = structureGameData(gameCode, content);

        setGameState({
          [gameCode]: structuredData,
        });
        setRanking(Array.isArray(remoteRanking) ? remoteRanking : []);
      } catch (error) {
        if (!active) return;
        console.error("Erro ao carregar jogo:", error);
        setGameState({});
        setRanking([]);
      } finally {
        if (active) setLoading(false);
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [selectedGame.code]);

  // Estrutura dados específicos de cada jogo
  const structureGameData = (gameCode, rawData) => {
    const structure = {
      memory: () => {
        let syms = [];
        if (Array.isArray(rawData?.words)) {
          syms = rawData.words;
        } else if (Array.isArray(rawData?.symbols)) {
          syms = rawData.symbols;
        } else if (Array.isArray(rawData?.data)) {
          syms = rawData.data;
        } else if (Array.isArray(rawData)) {
          syms = rawData;
        }
        return {
          symbols: syms,
          raw: rawData,
        };
      },
      hangman: () => ({
        words: normalizeWords(rawData?.words),
        raw: rawData,
      }),
      labirinto: () => {
        const rawWords = Array.isArray(rawData?.words) ? rawData.words : (Array.isArray(rawData) ? rawData : []);
        const structuredWords = rawWords.map((item) => {
          if (typeof item === "string") {
            return { word: item.trim().toUpperCase(), hint: "" };
          }
          const wordStr = (item?.word ?? item?.text ?? item?.value ?? item?.name ?? "").trim().toUpperCase();
          
          let hintStr = item?.hint || "";
          if (item?.meta) {
            let metaObj = item.meta;
            if (typeof metaObj === "string") {
              try { metaObj = JSON.parse(metaObj); } catch (e) {}
            }
            hintStr = metaObj?.hint || hintStr;
          }
          return { word: wordStr, hint: hintStr };
        }).filter(item => item.word.length > 0);

        return {
          words: structuredWords,
          wordLength: rawData?.wordLength,
          raw: rawData,
        };
      },
      quiz: () => ({
        questions: Array.isArray(rawData?.quiz)
          ? rawData.quiz
          : Array.isArray(rawData?.questions)
            ? rawData.questions
            : Array.isArray(rawData) ? rawData : [],
        raw: rawData,
      }),
      catch: () => ({
        config: rawData?.config || {},
        raw: rawData,
      }),
      whac: () => ({
        config: rawData?.config || {},
        raw: rawData,
      }),
      wordsearch: () => {
        const rawWords = Array.isArray(rawData?.words) ? rawData.words : (Array.isArray(rawData) ? rawData : []);
        return {
          words: rawWords.map((w) => (typeof w === "string" ? w : w.word)),
          raw: rawData,
        };
      },
      soletra: () => ({
        roundData: rawData,
        raw: rawData,
      }),
    };

    const structureFn = structure[gameCode] || (() => ({ raw: rawData }));
    return structureFn();
  };

  // Normaliza palavras para formato string
  const normalizeWords = (items) => {
    if (!Array.isArray(items)) return [];
    return items
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object") {
          return item.word ?? item.text ?? item.value ?? item.name ?? "";
        }
        return "";
      })
      .map((word) => String(word).trim().toUpperCase())
      .filter((word) => word.length > 0);
  };

  const pendingScoreRef = useRef(null);

  const handleScore = (payload = {}) => {
    pendingScoreRef.current = payload;
  };

  const commitPendingScore = async () => {
    if (!pendingScoreRef.current) return;
    const payload = pendingScoreRef.current;
    pendingScoreRef.current = null; // Evita dupla execucao

    const phone = String(player.phone ?? "").trim();
    if (!phone) return;

    setSaving(true);
    try {
      await saveGameScore({
        phone,
        gameCode: selectedGame.code ?? "memory",
        points: Number(payload.score ?? payload.points ?? 0),
        remainingSeconds: Number(payload.remainingSeconds ?? 0),
        timedOut: Boolean(payload.timedOut),
        isTotem: true,
      });
      const remoteRanking = await getRanking().catch(() => []);
      setRanking(Array.isArray(remoteRanking) ? remoteRanking : []);

      // Verifica se as configurações do jogo foram alteradas no backend
      try {
        const versionData = await getGameRulesVersion(selectedGame.code ?? "memory");
        const latestVersion = versionData?.version || 1;
        const currentRulesVersion = selectedGame.rulesVersion || 1;
        
        if (latestVersion > currentRulesVersion) {
          localStorage.setItem("game_rules_outdated_" + (selectedGame.code ?? "memory"), "true");
        }
      } catch (errRule) {
        console.warn("Erro ao checar alteração de regras pós-jogo:", errRule);
      }
    } catch (error) {
      console.warn("Falha ao salvar pontuação, seguindo sem backend:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleBackToCadastroWithScore = async () => {
    await commitPendingScore();
    onBackToCadastro?.();
  };

  const handleBackToMenuWithScore = async () => {
    await commitPendingScore();
    onBackToMenu?.();
  };

  useEffect(() => {
    return () => {
      // Salva score pendente ao desmontar o componente (saida do jogo)
      commitPendingScore();
    };
  }, []);

  const renderGame = () => {
    const code = selectedGame.code ?? "memory";
    const data = gameState[code] || {};
    const gameTitle = selectedGame.title ?? selectedGame.name ?? code;

    const commonProps = {
      ranking,
      onScore: handleScore,
      config: selectedGame.config || {},
      headerProps: {
        onBackToMenu: handleBackToMenuWithScore,
        onBackToCadastro: handleBackToCadastroWithScore,
        title: gameTitle,
      },
    };

    switch (code) {
      case "memory":
        return (
          <MemoryGame data={{ symbols: data.symbols || [] }} {...commonProps} />
        );

      case "hangman":
        return (
          <HangmanGame data={{ words: data.words || [] }} {...commonProps} />
        );

      case "labirinto":
        return (
          <LabirintoGame data={{ words: data.words || [] }} {...commonProps} />
        );

      case "quiz":
        return (
          <QuizGame
            data={{ questions: data.questions || [] }}
            {...commonProps}
          />
        );

      case "catch":
        return <CatchGame data={data} {...commonProps} />;

      case "whac":
        return (
          <WhacGame
            data={data}
            onPlayAgain={() => window.location.reload()}
            {...commonProps}
          />
        );

      case "wordsearch":
        return (
          <WordSearchGame data={{ words: data.words || [] }} {...commonProps} />
        );

      case "soletra":
        return (
          <SoletraGame
            data={{ roundData: data.roundData || data.raw }}
            {...commonProps}
          />
        );

      default:
        return <p>Jogo não encontrado: {code}</p>;
    }
  };

  if (loading) {
    return <p>Carregando {selectedGame.title}...</p>;
  }

  return (
    <>
      {renderGame()}
      {saving && <p>Salvando pontuação...</p>}
    </>
  );
}

export default Jogos;
