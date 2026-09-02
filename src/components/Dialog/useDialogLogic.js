import { useEffect, useState, useCallback } from "react";
import { subscribe } from "./gameEndReporter";

// Hook para consumir eventos de fim de jogo enviados por `reportGameEnd`
export function useDialogLogic() {
    const [open, setOpen] = useState(false);
    const [payload, setPayload] = useState(null);

    useEffect(() => {
        const unsub = subscribe((data) => {
            // Recebe somente o payload final esperado: {game, score, remainingSeconds, timedOut}
            setPayload(data);
            setOpen(true);
        });
        return unsub;
    }, []);

    const close = useCallback(() => {
        setOpen(false);
        setPayload(null);
    }, []);

    return { open, payload, close };
}

export default useDialogLogic;
