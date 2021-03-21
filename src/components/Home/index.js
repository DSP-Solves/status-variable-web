import { useEffect, useState } from "react";

import {
  Layout,
  Menu,
  Breadcrumb,
  Spin,
  Dropdown,
  Row,
  Drawer,
  Select,
} from "antd";

import "./style.css";
import MemberCard from "../MemberCard";
import firebase from "../../config/firebase";

const { Option } = Select;
const { Header, Content, Footer } = Layout;

const accountMenu = (
  <Menu>
    <Menu.Item>Profile</Menu.Item>
    <Menu.Item danger>Logout</Menu.Item>
  </Menu>
);

function Home() {
  const [team, setTeam] = useState(null);
  const [user, setUser] = useState(null);
  const [common, setCommon] = useState(null);
  const [statusDrawerVisible, setStatusDrawerVisible] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);

  let statusSelectRef;

  const updateStatus = (status) => {
    if (status === user.status) return;

    setStatusUpdating(true);
    statusSelectRef.blur();

    firebase
      .firestore()
      .collection("users")
      .doc(firebase.auth().currentUser.uid)
      .update({ status })
      .then(() => {
        setUser({ ...user, status });
        setStatusUpdating(false);
      })
      .catch((err) => {
        console.error(err);
      });

    console.log({ uid: firebase.auth().currentUser.uid, status });
  };

  useEffect(() => {
    firebase
      .auth()
      .signInWithEmailAndPassword(
        process.env.REACT_APP_AUTH_EMAIL,
        process.env.REACT_APP_AUTH_PASSWORD
      )
      .then((response) =>
        firebase.firestore().collection("users").doc(response.user.uid).get()
      )
      .then((doc) => {
        if (doc.exists) {
          setUser(doc.data());
          return doc.data().team;
        } else {
          console.log("No such user!");
        }
      })
      .then((teamId) => {
        firebase
          .firestore()
          .collection("teams")
          .doc(teamId)
          .onSnapshot(
            (docSnapshot) => {
              setTeam(docSnapshot.data());
            },
            (err) => {
              console.log(`Encountered error: ${err}`);
            }
          );
      })
      .then(() => {
        firebase
          .firestore()
          .collection("internal")
          .doc("common")
          .get()
          .then((doc) => {
            if (doc.exists) {
              setCommon(doc.data().status);
            } else {
              console.log("No config available!");
            }
          });
      })
      .catch((err) => {
        console.error(err);
      });
  }, []);

  return (
    <Layout className="layout">
      <Header className="header">
        <div className="logo-and-nav-container">
          <span className="logo-title">StatusVariable</span>
          <Menu theme="dark" mode="horizontal" defaultSelectedKeys={["1"]}>
            <Menu.Item key="1">Overview</Menu.Item>
            <Menu.Item key="2">My Team</Menu.Item>
            <Menu.Item key="3">Billing</Menu.Item>
          </Menu>
        </div>
        <div className="my-and-my-container">
          <span
            style={{ color: "white", cursor: "pointer", marginRight: "1rem" }}
            onClick={() => setStatusDrawerVisible(true)}
          >
            My Status
          </span>

          <Drawer
            title="My Status"
            placement="right"
            closable={false}
            onClose={() => setStatusDrawerVisible(false)}
            visible={statusDrawerVisible}
            key="right"
          >
            <Spin spinning={statusUpdating} delay={500}>
              <Select
                defaultValue={user ? user.status : ""}
                showSearch
                style={{ width: 200 }}
                placeholder="Search to Select"
                onChange={updateStatus}
                optionFilterProp="children"
                filterOption={(input, option) =>
                  option.children.toLowerCase().indexOf(input.toLowerCase()) >=
                  0
                }
                filterSort={(optionA, optionB) =>
                  optionA.children
                    .toLowerCase()
                    .localeCompare(optionB.children.toLowerCase())
                }
                ref={(input) => (statusSelectRef = input)}
              >
                {common &&
                  Object.keys(common).map((status) => (
                    <Option key={status} value={status}>
                      {common[status].label}
                    </Option>
                  ))}
              </Select>
            </Spin>
          </Drawer>

          <Dropdown overlay={accountMenu} placement="bottomCenter" arrow>
            <span style={{ color: "white", cursor: "default" }}>
              My Account
            </span>
          </Dropdown>
        </div>
      </Header>

      <Content style={{ padding: "0 50px" }}>
        <Breadcrumb style={{ margin: "16px 0", cursor: "default" }}>
          <Breadcrumb.Item>
            {team ? team.info.organization : "My Team"}
          </Breadcrumb.Item>
        </Breadcrumb>
        <Spin spinning={!(team && team.members.length)}>
          <div className="site-layout-content">
            <div className="cards-container">
              <Row gutter={[24, 24]} style={{ width: "100%" }}>
                {team &&
                  team.members.map((memberId) => (
                    <MemberCard
                      key={memberId}
                      memberId={memberId}
                      status={common}
                    />
                  ))}
              </Row>
            </div>
          </div>
        </Spin>
      </Content>

      <Footer style={{ textAlign: "center" }}>
        StatusVariable ©2021 | Developed by @dspsolves
      </Footer>
    </Layout>
  );
}

export default Home;
