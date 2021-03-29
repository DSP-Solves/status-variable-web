import { Col } from "antd";
import { PlusCircleTwoTone } from "@ant-design/icons";

import "./style.css";

function AddMemberCard({ onClick }) {
  return (
    <Col span={8} onClick={onClick}>
      <div className="add-member-card">
        <PlusCircleTwoTone
          className="add-member-icon"
          twoToneColor={"#2196f3"}
        />
      </div>
    </Col>
  );
}

export default AddMemberCard;
