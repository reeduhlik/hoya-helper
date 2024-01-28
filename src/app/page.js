"use client";
import styles from "./page.module.css";
import { useEffect, useState } from "react";
import AddIcon from "@mui/icons-material/Add";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { TypeAnimation } from "react-type-animation";
import { SyncLoader } from "react-spinners";
import useEventListener from "@use-it/event-listener";
import ReactMarkdown from "react-markdown";

export default function Home() {
  const [recentChats, setRecentChats] = useState([]);

  const [currentChat, setCurrentChat] = useState([]);

  const systemPrompt = {
    role: "system",
    content:
      "You are a factual, conversational chatbot for Georgetown University. The provided data is ONLY to be used if you don't have a specific answer.  NEVER SAY that you don't know or the requested information is not in the documents.  Again, this is only to be used if you don't have a specific answer. Also maintain a supportive tone to inform and support the high schooler users.",
  };

  const [faqs, setFaqs] = useState([
    "When will the first year application for Fall 2025 be available?",
    "What are some popular classes for International Economics majors at Georgetown?",
    "Does price of admission change for current students?",
    "Tell me about recent residential changes at georgetown.",
  ]);

  const handleKeyDown = (event) => {
    if (event.keyCode === 13 && loading == false) {
      submitSearch();
    }
  };

  useEventListener("keydown", handleKeyDown);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const updateScroll = () => {
    const element = document.getElementById("chatbubbles");

    element.scrollTop = element.scrollHeight;
  };

  const api_key = "b6f9c0cfbd2c493f86743dfb6d1e3da4";

  const search_url = "https://team20.search.windows.net";
  const search_key = "34NGtYQVlBK2m47yXobE4JMugTC7hMqVwKPjbvQIhWAzSeBGQuHm";

  const newChatFunction = () => {
    setRecentChats((recentChats) => [...recentChats, currentChat]);
    setCurrentChat([]);
  };

  const populateCurrentChat = (index) => {
    console.log(index);
    console.log(recentChats[index]);
    setCurrentChat(recentChats[index]);
  };
  const submitSearch = async () => {
    if (input == "") return;

    setLoading(true);

    console.log("Input is " + input);

    //output the currentchat array

    //take the current input to query Azure Search

    console.log("Calling Azure Search");

    const payload = {
      dataSources: [
        {
          type: "AzureCognitiveSearch",
          parameters: {
            endpoint: search_url,
            key: search_key,
            indexName: "cosmosdb-index",
            inScope: false,
            roleInformation:
              "You are only to consult these documents if you don't have a specific answer.  NEVER SAY that you don't know or the requested information is not in the documents.  Again, this is only to be used if you don't have a specific answer.",
            topNDocuments: 3,
          },
        },
      ],
      messages: [
        systemPrompt,
        ...currentChat,
        { role: "user", content: input },
      ],
      max_tokens: 400,
      stop: null,
      temperature: 1,
      inScope: false,
    };

    console.log(payload);

    setCurrentChat((currentChat) => [
      ...currentChat,
      {
        role: "user",
        content: input,
      },
    ]);

    setInput("");

    const res = await fetch(
      "https://studio205859928605.openai.azure.com/openai/deployments/gpt-4/extensions/chat/completions?api-version=2023-08-01-preview",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": api_key,
        },
        body: JSON.stringify(payload),
      }
    );

    if (res.status != 200) {
      //if the response is not 200, then we have an error
      console.log("Error with Azure Search");
      console.log(res);
      setLoading(false);

      setCurrentChat((currentChat) => [
        ...currentChat,
        {
          role: "assistant",
          content: "Sorry, there was an error. Please try again.",
        },
      ]);
      return;
    }

    const data = await res.json();

    console.log(data);

    let responseText = data.choices[0].message.content;

    //remove any substrings that are [doc1]
    responseText = responseText.replace(/\[doc\d\]/g, "");

    if (data.choices[0].message.context) {
      responseText += "\n\n\n**Relevant Links**";
      console.log("CONTEXT");
      JSON.parse(
        data.choices[0].message.context.messages[0].content
      ).citations.forEach((citation) => {
        responseText += "\n\n" + `[${citation.url}](` + citation.url + `)`;
      });
    }

    setCurrentChat((currentChat) => [
      ...currentChat,
      {
        role: "assistant",
        content: responseText,
      },
    ]);

    console.log(currentChat);
    setLoading(false);
  };

  useEffect(() => {}, []);

  return (
    <main className={styles.main}>
      <div className={styles.left}>
        <img src="/logo.png" alt="1" />
        <h1>Hoya Helper</h1>
        <h6>A personalized Georgetown chat bot.</h6>
        <div className={styles.chats}>
          <button className={styles.newChat} onClick={newChatFunction}>
            <p>New Chat</p>
            <AddIcon />
          </button>
          <h3>Recent Chats</h3>
          <div className={styles.newChats}>
            {recentChats.map((chat, index) => (
              <div
                className={styles.chat}
                onClick={() => populateCurrentChat(index)}>
                <p>
                  {chat.length > 0
                    ? chat[0]?.content.substring(0, 24) + "..."
                    : "New Chat"}
                </p>
                <KeyboardArrowRightIcon />
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className={styles.right}>
        {currentChat.length == 0 ? (
          <div className={styles.faq}>
            {faqs.map((faq) => (
              <div
                className={styles.faqItem}
                onClick={() => {
                  //first call set input, then submit search after set input
                  setInput(faq);
                }}>
                <h5>Popular Question</h5>
                <p>{faq}</p>
                <ArrowForwardIcon />
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.chatbubbles} id="chatbubbles">
            {currentChat.map((chat) => {
              if (chat.role == "user") {
                return (
                  <div className={styles.userchat}>
                    <h5>You</h5>
                    <p>{chat.content}</p>
                  </div>
                );
              } else {
                return (
                  <div className={styles.botchat}>
                    <div className={styles.botchattitle}>
                      <img src="/logo.png" alt="1" />
                      <h5>Jack the Bulldog</h5>
                    </div>
                    <ReactMarkdown className={styles.markdown}>
                      {chat.content}
                    </ReactMarkdown>
                  </div>
                );
              }
            })}
            {loading && (
              <SyncLoader loading={loading} size={14} color="#c3dff5" />
            )}
            <div id="anchor"></div>;
          </div>
        )}
        <div className={styles.bottomchat}>
          <div className={styles.bottomchatcontainer}>
            <input
              type="text"
              placeholder="How can I help you today?"
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
              }}
            />
            <button onClick={submitSearch}>
              <ArrowForwardIcon />
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
