import { spaceFromLocation } from 'src/hooks/use-space';

import axios, { endpoints } from 'src/lib/axios';

// ----------------------------------------------------------------------

/** Opens (or reuses) the conversation with a user and returns its chat route. */
export async function openConversation(participantId, firstMessage) {
  const res = await axios.post(endpoints.conversations.list, {
    participant_id: participantId,
    ...(firstMessage && { message: firstMessage }),
  });
  return `${spaceFromLocation().chat}?c=${res.data.data.id}`;
}
