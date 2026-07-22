import * as React from "react";

export function useGate1StatusRetain() {
  const [statusChangeRetainedWorkerId, setStatusChangeRetainedWorkerId] =
    React.useState<string | null>(null);
  const statusChangeRetainTimeoutRef = React.useRef<number | null>(null);

  const retainSelectedWorkerAfterStatusChange = React.useCallback(
    (workerId: string) => {
      if (statusChangeRetainTimeoutRef.current) {
        window.clearTimeout(statusChangeRetainTimeoutRef.current);
      }

      setStatusChangeRetainedWorkerId(workerId);
      statusChangeRetainTimeoutRef.current = window.setTimeout(() => {
        setStatusChangeRetainedWorkerId((current) =>
          current === workerId ? null : current,
        );
        statusChangeRetainTimeoutRef.current = null;
      }, 10_000);
    },
    [],
  );

  React.useEffect(() => {
    return () => {
      if (statusChangeRetainTimeoutRef.current) {
        window.clearTimeout(statusChangeRetainTimeoutRef.current);
      }
    };
  }, []);

  return {
    retainSelectedWorkerAfterStatusChange,
    statusChangeRetainedWorkerId,
  };
}
