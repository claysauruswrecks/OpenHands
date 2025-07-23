import { useEffect } from "react";
import { useParams } from "react-router";
import { useUserConversation } from "./use-user-conversation";
import OpenHands from "#/api/open-hands";

const FIVE_MINUTES = 1000 * 60 * 5;

export const useActiveConversation = () => {
  const { conversationId } = useParams<{ conversationId?: string }>();
  const userConversation = useUserConversation(
    conversationId || null,
    (query) => {
      if (query.state.data?.status === "STARTING") {
        return 3000; // 3 seconds
      }
      return FIVE_MINUTES;
    },
  );

  useEffect(() => {
    const conversation = userConversation.data;
    OpenHands.setCurrentConversation(conversation || null);
  }, [
    conversationId,
    userConversation.isFetched,
    userConversation?.data?.status,
  ]);
  return userConversation;
};
