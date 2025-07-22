import { useQuery } from "@tanstack/react-query";
import OpenHands from "#/api/open-hands";
import { useConversationId } from "#/hooks/use-conversation-id";
import { useRuntimeIsReady } from "#/hooks/use-runtime-is-ready";

export const useVSCodeRemoteControlPort = () => {
  const { conversationId } = useConversationId();
  const runtimeIsReady = useRuntimeIsReady();

  return useQuery({
    queryKey: ["vscode-remote-control-port", conversationId],
    queryFn: () => {
      if (!conversationId) throw new Error("No conversation ID");
      return OpenHands.getVSCodeRemoteControlPort(conversationId);
    },
    enabled: runtimeIsReady && !!conversationId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 15, // 15 minutes
    meta: {
      disableToast: true,
    },
  });
};
