import { useCallback, useEffect, useRef, useState } from "react";
import { AdStudioConfirmDialog } from "../../AdStudio/components/AdStudioConfirmDialog";

type Confirmation = {
  title: string;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
};

export function useBrandKitConfirmation() {
  const [request, setRequest] = useState<Confirmation>();
  const resolvePending = useRef<(confirmed: boolean) => void>(undefined);
  const confirm = useCallback((options: Confirmation) => {
    if (resolvePending.current) return Promise.resolve(false);
    return new Promise<boolean>(resolve => {
      resolvePending.current = resolve;
      setRequest(options);
    });
  }, []);

  function complete(confirmed: boolean) {
    const resolve = resolvePending.current;
    resolvePending.current = undefined;
    setRequest(undefined);
    resolve?.(confirmed);
  }

  useEffect(() => () => {
    resolvePending.current?.(false);
    resolvePending.current = undefined;
  }, []);

  return {
    confirm,
    confirmation: request && (
      <AdStudioConfirmDialog
        {...request}
        open
        busy={false}
        pendingLabel={request.confirmLabel}
        onCancel={() => complete(false)}
        onConfirm={() => complete(true)}
      />
    ),
  };
}
