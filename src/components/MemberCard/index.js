import { useEffect, useState } from "react";
import { Card, Col } from "antd";
import {
  CheckCircleTwoTone,
  ClockCircleTwoTone,
  CloseCircleTwoTone,
  PhoneTwoTone,
} from "@ant-design/icons";

import "./style.css";
import firebase from "../../config/firebase";

const StatusIcon = ({ memberStatus, statusConfig }) => {
  let _;

  switch (memberStatus) {
    case "busy":
      _ = (
        <ClockCircleTwoTone
          className="status-icon"
          twoToneColor={statusConfig[memberStatus].color}
        />
      );
      break;
    case "working":
      _ = (
        <CheckCircleTwoTone
          className="status-icon"
          twoToneColor={statusConfig[memberStatus].color}
        />
      );
      break;
    case "unavailable":
      _ = (
        <CloseCircleTwoTone
          className="status-icon"
          twoToneColor={statusConfig[memberStatus].color}
        />
      );
      break;
    case "oncall":
      _ = (
        <PhoneTwoTone
          className="status-icon"
          twoToneColor={statusConfig[memberStatus].color}
        />
      );
      break;
    default:
      break;
  }

  return _;
};

function MemberCard({ memberId, status }) {
  const [member, setMember] = useState(null);

  useEffect(() => {
    if (!memberId) return;

    console.log("for", memberId);

    firebase
      .firestore()
      .collection("users")
      .doc(memberId)
      .onSnapshot(
        (docSnapshot) => {
          console.log("Received member snapshot");
          setMember(docSnapshot.data());
        },
        (err) => {
          console.log(`Encountered error: ${err}`);
        }
      );
  }, [memberId]);

  return (
    <Col span={8}>
      {member ? (
        <div
          className="member-card"
          style={{ borderBottomColor: status[member.status].color }}
        >
          <div className="member-card-name">
            <span>{member.info.name}</span>
          </div>
          <div className="member-card-role">
            <span>{member.info.role}</span>
          </div>
          <div className="member-card-status-container">
            <div className="member-card-status-icon">
              <StatusIcon memberStatus={member.status} statusConfig={status} />
            </div>
            <div className="member-card-status">
              <span>{status[member.status].label}</span>
            </div>
          </div>
        </div>
      ) : (
        <Card loading={true} />
      )}
    </Col>
  );
}

export default MemberCard;
