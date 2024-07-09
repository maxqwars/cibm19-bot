import { Impact } from "../helpers/Impact";

const testQueryCallback = new Impact({
  name: "test_query_callback",
  signature: new RegExp(/(test_query_)(success|failure)(=\d)/gm),
  callback: async function (context, core) {
    console.log(`test_query_callback`);
    context.telegram.editMessageText(
      context.chat.id,
      context.callbackQuery.message.message_id,
      context.callbackQuery.inline_message_id,
      "done",
    );
    return;
  },
});

export default testQueryCallback;
