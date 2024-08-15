import "./App.css";

import { createEncoder, createDecoder, type PeersByDiscoveryResult, Tags } from "@waku/sdk";
import protobuf from "protobufjs";
import { useEffect, useState } from "react";
import { useWaku, useFilterMessages, useLightPush } from "@waku/react";
import { Peer } from "@libp2p/interface";

const contentTopic = "/atoma/test/message/proto";
const encoder = createEncoder({ contentTopic, ephemeral: true });
const decoder = createDecoder(contentTopic);
const chatMessageType = new protobuf.Type("ChatMessage")
  .add(new protobuf.Field("timestamp", 1, "uint64"))
  .add(new protobuf.Field("name", 2, "uint64"))
  .add(new protobuf.Field("message", 3, "string"));

function App() {
  const [chatMessage, setChatMessage] = useState("");
  const [anonymousId, setAnonymousId] = useState("");
  const [wakuMessages, setMessages] = useState<{ name: string; message: string }[]>([]);
  // Create and start a Light Node
  const { node, error, isLoading } = useWaku();
  const { messages: filterMessages } = useFilterMessages({ node, decoder });
  const { push } = useLightPush({ node, encoder });

  useEffect(() => {
    console.log("filterMessages", filterMessages);
    console.log("node", node);
    console.log("isLoading", isLoading);
    if (node === undefined || isLoading) {
      return;
    }
    node?.connectionManager
      .getPeersByDiscovery()
      .then((res: PeersByDiscoveryResult) => {
        console.log(res);
        console.log("Node");
        for (const conn_disc in res) {
          for (const tag in res[conn_disc]) {
            res[conn_disc][tag].forEach((peer: Peer) => {
              let id = peer.id.toString();
              for (const address of peer.addresses) {
                const x = address.multiaddr.toString();
                if (!x.endsWith("wss")) {
                  console.log(conn_disc, tag, "-", x + "/p2p/" + id);
                }
                // if address.multiaddr.toString().
                // console.log()
                // console.log("conn_disc", conn_disc, "tag", tag, "address", address.multiaddr.toString());
              }
            });
          }
        }
      })
      .catch((err) => {
        console.error(err);
      });
  }, [filterMessages, node, encoder, isLoading]);
  useEffect(() => {
    setAnonymousId(Math.floor(Math.random() * 1000000).toString());
  }, []);
  console.log("filterMessages", filterMessages);

  useEffect(() => {
    setMessages(
      filterMessages.map((wakuMessage) => {
        console.log("wakuMessage", wakuMessage);
        if (!wakuMessage.payload) return;
        return chatMessageType.decode(wakuMessage.payload);
      })
    );
  }, [filterMessages]);

  const sendMessage = () => {
    if (isLoading || encoder === undefined || node === undefined) {
      return;
    }
    console.log("Sending message", chatMessage, anonymousId);
    const protoMessage = chatMessageType.create({
      timestamp: Date.now(),
      name: anonymousId,
      message: chatMessage,
    });
    const timestamp = Date.now();
    const serializedMessage = chatMessageType.encode(protoMessage).finish();
    console.log("pushes", push);
    push({ payload: serializedMessage, timestamp })
      .then((res) => {
        console.log(res);
      })
      .catch((err) => {
        console.error(err);
      });
    console.log("pushed");
  };

  if (isLoading) {
    return <div>Initializing...</div>;
  }
  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div>
      <h1>Anonymous chat</h1>
      <div>Anonymous ID: {anonymousId}</div>
      <div>
        {wakuMessages.map(({ name, message }, i) => {
          return (
            <div key={i}>
              <span>{name} : </span>
              <span>{message}</span>
            </div>
          );
        })}
      </div>
      <input type="text" onChange={(e) => setChatMessage(e.target.value)} value={chatMessage} />
      <button onClick={sendMessage}>Send Message</button>
    </div>
  );
}

export default App;
