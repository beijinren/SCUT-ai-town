import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import Button from "./buttons/Button";
import { toastOnError } from "../toasts";

export default function ResetWorldButton() {
  const [isResetting, setIsResetting] = useState(false);
  const hardResetWorldState = useMutation(api.testing.hardResetWorldState);
  const initWorld = useMutation(api.init.default);

  const onReset = async () => {
    if (isResetting) {
      return;
    }
    const confirmed = window.confirm(
      "这会清空当前开发世界里的旧对话、历史归档和长期记忆，并重建一个干净场景。要继续吗？",
    );
    if (!confirmed) {
      return;
    }
    setIsResetting(true);
    try {
      await toastOnError(hardResetWorldState({}));
      await toastOnError(initWorld({}));
      window.location.reload();
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <Button
      onClick={onReset}
      className={isResetting ? "opacity-50 pointer-events-none" : ""}
      title="清空当前开发世界里的旧对话、归档历史和长期记忆，然后重新初始化场景。"
      imgUrl="/assets/star.svg"
    >
      {isResetting ? "重置中..." : "清空历史并重建世界"}
    </Button>
  );
}
