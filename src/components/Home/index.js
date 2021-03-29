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
  Form,
  Input,
  Button,
  Checkbox,
  message,
  Divider,
  Empty,
  Radio,
  Tooltip,
} from "antd";
import { MailOutlined, LockOutlined } from "@ant-design/icons";

import "./style.css";
import MemberCard from "../MemberCard";
import firebase from "../../config/firebase";
import AddMemberCard from "../AddMemberCard";

const { Option } = Select;
const { Header, Content, Footer } = Layout;

const requestResetPasswordEmail = ({ email }) => {
  firebase
    .auth()
    .sendPasswordResetEmail(email)
    .then(function () {
      message.success("Please check your email");
    })
    .catch((err) => {
      console.error(err);
      message.error("Unable to send email");
    });
};

const logOutUser = () =>
  firebase
    .auth()
    .signOut()
    .then(() => message.info("logged out"))
    .catch(console.error);

const accountMenu = (
  <Menu>
    <Menu.Item>Profile</Menu.Item>
    <Menu.Item onClick={logOutUser} danger>
      Logout
    </Menu.Item>
  </Menu>
);

function Home() {
  const [team, setTeam] = useState(null);
  const [user, setUser] = useState(null);
  const [userAuthObj, setUserAuthObj] = useState(null);
  const [common, setCommon] = useState(null);
  const [userPrettyNew, setUserPrettyNew] = useState(false);
  const [showNoTeamView, setShowNoTeamView] = useState(false);
  const [showPasswordResetForm, setShowPasswordResetForm] = useState(false);
  const [planMemberSize, setPlanMemberSize] = useState(5);

  const [statusDrawerVisible, setStatusDrawerVisible] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);

  const [addMemberDrawerVisible, setAddMemberDrawerVisible] = useState(false);
  const [memberAdding, setMemberAdding] = useState(false);

  const [showCreateTeamForm, setShowCreateTeamForm] = useState(false);
  const [creatingTeam, setCreatingTeam] = useState(false);

  const [showLoginForm, setShowLoginForm] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);

  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [registering, setRegistering] = useState(false);

  const [showOverviewView, setShowOverviewView] = useState(true);
  const [showMyTeamView, setShowMyTeamView] = useState(false);
  const [showBillingView, setShowBillingView] = useState(false);

  let statusSelectRef;

  const refreshUserData = new Promise((resolve, reject) => {
    if (!userAuthObj) {
      return resolve({});
    }

    firebase
      .firestore()
      .collection("users")
      .doc(userAuthObj.uid)
      .get()
      .then((doc) => {
        if (doc.exists) {
          setUser(doc.data());
          return resolve(doc.data());
        } else resolve({});
      })
      .catch((err) => reject(err));
  });

  const registerUser = ({ email, password, remember, ...meta }) => {
    setRegistering(true);

    firebase
      .auth()
      .createUserWithEmailAndPassword(email, password)
      .then(async (userCredential) => {
        var user = userCredential.user;

        await firebase.firestore().collection("users").doc(user.uid).set({
          info: meta,
          status: null,
          team: null,
        });

        return refreshUserData;
      })
      .catch((err) => {
        console.error(err);
        message.error(err.code);
      })
      .finally(() => {
        setShowRegisterForm(false);
        setRegistering(false);
      });
  };

  const logInUser = ({ email, password, remember }) => {
    setLoggingIn(true);

    if (remember) {
      firebase
        .auth()
        .signInWithEmailAndPassword(email, password)
        .then(() => message.info("logged in"))
        .catch((err) => {
          if (err.code === "auth/user-not-found") {
            message.error("Invalid User");
          } else if (err.code === "auth/wrong-password") {
            message.error("Incorrect Password");
          } else {
            console.error(err);
            message.error(err.code);
          }
        })
        .finally(() => setLoggingIn(false));
    } else {
      firebase
        .auth()
        .setPersistence(firebase.auth.Auth.Persistence.SESSION)
        .then(() => firebase.auth().signInWithEmailAndPassword(email, password))
        .then(() => message.info("logged in"))
        .catch((err) => {
          if (err.code === "auth/user-not-found") {
            message.error("Invalid User");
          } else {
            console.error(err);
            message.error(err.code);
          }
        });
    }
  };

  const addMember = ({ email }) => {
    setMemberAdding(true);

    if (
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1"
    ) {
      firebase.functions().useEmulator("localhost", 5001);
    }
    const addMemberCloudFunc = firebase.functions().httpsCallable("addMember");

    addMemberCloudFunc({ email, user })
      .then((response) => {
        if (response.data.errorInfo) {
          if (response.data.errorInfo.code === "auth/user-not-found") {
            message.error("No such user");
          } else {
            console.error(response.data.errorInfo);
            message.error("Bad request");
          }
        } else {
          message.success("Member added");
          setAddMemberDrawerVisible(false);
        }
      })
      .catch((err) => {
        console.log({ err });
      })
      .finally(() => {
        setMemberAdding(false);
      });
  };

  const registerTeam = async (entries) => {
    setCreatingTeam(true);

    const teamObj = {
      admin: userAuthObj.uid,
      info: {
        country: entries.country,
        organization: entries.organization,
      },
      plan: entries.plan,
      members: [userAuthObj.uid],
    };

    try {
      const teamDocRef = await firebase
        .firestore()
        .collection("teams")
        .doc(entries.team);

      const alreadyExists = await teamDocRef.get();
      if (alreadyExists.exists) {
        return message.warn("Please select another team name");
      }

      await teamDocRef.set(teamObj);

      await firebase
        .firestore()
        .collection("users")
        .doc(userAuthObj.uid)
        .update({
          team: entries.team,
          status: "unavailable",
        });

      await Promise.all([refreshUserData]);
      message.info("Please reload the page");
    } catch (err) {
      console.error(err);
      message.error(err.code);
    } finally {
      setCreatingTeam(false);
    }
  };

  const updatePlanMemberSize = (e) => {
    switch (e.target.value) {
      case "micro":
        setPlanMemberSize(5);
        break;

      case "small":
        setPlanMemberSize(15);
        break;

      default:
        break;
    }
  };

  const updateStatus = (status) => {
    if (status === user.status) return;

    setStatusUpdating(true);
    statusSelectRef.blur();

    firebase
      .firestore()
      .collection("users")
      .doc(firebase.auth().currentUser.uid)
      .update({ status })
      .then(() => setUser({ ...user, status }))
      .catch((err) => console.error(err))
      .finally(() => setStatusUpdating(false));
  };

  // auth listener
  useEffect(() => {
    firebase.auth().onAuthStateChanged(function (user) {
      if (user) {
        setUserAuthObj(user);
      } else {
        setUserAuthObj(null);
        setShowLoginForm(true);
      }
    });
  }, []);

  useEffect(() => {
    if (!userAuthObj) return;

    firebase
      .firestore()
      .collection("users")
      .doc(userAuthObj.uid)
      .get()
      .then((doc) => {
        if (doc.exists) {
          setUser(doc.data());
          return doc.data();
        } else {
          return {};
        }
      })
      .then((userData) => {
        if (userData.team) {
          firebase
            .firestore()
            .collection("teams")
            .doc(userData.team)
            .onSnapshot(
              (docSnapshot) => {
                setTeam(docSnapshot.data());
              },
              (err) => {
                if (err.code !== "permission-denied") {
                  console.error(err);
                  message.error(err.code);
                }
              }
            );
        } else {
          setShowNoTeamView(true);
          setUserPrettyNew(true);
        }
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
              message.error("No config available!");
            }
          });
      })
      .catch((err) => {
        console.error(err);
        message.error(err.code);
      });
  }, [userAuthObj]);

  return (
    <Layout className="layout">
      <Header className="header">
        <div className="logo-and-nav-container">
          <span className="logo-title">StatusVariable</span>
          {userAuthObj && (
            <Menu
              theme="dark"
              mode="horizontal"
              defaultSelectedKeys={["1"]}
              onSelect={({ key }) => {
                switch (parseInt(key, 10)) {
                  case 1:
                    setShowOverviewView(true);
                    setShowMyTeamView(false);
                    setShowBillingView(false);
                    break;
                  case 2:
                    setShowOverviewView(false);
                    setShowMyTeamView(true);
                    setShowBillingView(false);
                    break;
                  case 3:
                    setShowOverviewView(false);
                    setShowMyTeamView(false);
                    setShowBillingView(true);
                    break;
                  default:
                    break;
                }
              }}
            >
              <Menu.Item key="1">Overview</Menu.Item>
              {!userPrettyNew && <Menu.Item key="2">My Team</Menu.Item>}
              <Menu.Item key="3">Billing</Menu.Item>
            </Menu>
          )}
        </div>
        {userAuthObj && (
          <div className="my-and-my-container">
            {!userPrettyNew && (
              <span
                style={{
                  color: "white",
                  cursor: "pointer",
                  marginRight: "1rem",
                }}
                onClick={() => setStatusDrawerVisible(true)}
              >
                My Status
              </span>
            )}

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
                    option.children
                      .toLowerCase()
                      .indexOf(input.toLowerCase()) >= 0
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
        )}
      </Header>

      <Content style={{ padding: "0 50px" }}>
        <Breadcrumb
          style={{
            cursor: "default",
            margin: "16px 0",
            opacity: userAuthObj && !userPrettyNew ? "100%" : "0%",
          }}
        >
          <Breadcrumb.Item>{team && team.info.organization}</Breadcrumb.Item>
          {showMyTeamView && <Breadcrumb.Item>{"My Team"}</Breadcrumb.Item>}
          {showBillingView && <Breadcrumb.Item>{"Billing"}</Breadcrumb.Item>}
        </Breadcrumb>

        {userAuthObj ? (
          <div className="main-container">
            {userPrettyNew ? (
              <div className="site-layout-content">
                {showNoTeamView && (
                  <div className="no-team-container">
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      imageStyle={{
                        height: 60,
                      }}
                      description={
                        <div>
                          <span>
                            Hmm... You aren't associated with any team.{" "}
                          </span>{" "}
                          <br />
                          <br />
                          <span>Ask your IT Manager to send you an invite</span>
                        </div>
                      }
                    >
                      <div className="no-team-info-container">
                        <span>OR</span>
                        <Button
                          type="primary"
                          onClick={() => {
                            setShowNoTeamView(false);
                            setShowCreateTeamForm(true);
                          }}
                        >
                          Create a Team
                        </Button>
                      </div>
                    </Empty>
                  </div>
                )}

                {showCreateTeamForm && (
                  <div className="create-team-form-container">
                    <Spin spinning={creatingTeam}>
                      <div className="create-team-form-container-actual">
                        <div className="create-team-form-title-container">
                          <span className="create-team-form-title">
                            Create A Team
                          </span>
                        </div>
                        <Form
                          name="normal_create_team"
                          className="create-team-form"
                          initialValues={{
                            plan: "micro",
                            organization: user.info.organization,
                          }}
                          onFinish={registerTeam}
                          onFinishFailed={console.error}
                        >
                          <Form.Item
                            name="country"
                            // label="Country"
                            rules={[
                              {
                                required: true,
                                message: "Please input your Country!",
                              },
                            ]}
                          >
                            <Input placeholder="Country" />
                          </Form.Item>

                          <Form.Item
                            name="organization"
                            // label="Organization"
                            rules={[
                              {
                                required: true,
                                message: "Please input your Organization!",
                              },
                            ]}
                          >
                            <Input placeholder="Organization" />
                          </Form.Item>

                          <Form.Item
                            name="team"
                            // label="Team Name"
                            rules={[
                              {
                                required: true,
                                message: "Please set a Team Name!",
                              },
                            ]}
                          >
                            <Input placeholder="Team Name" />
                          </Form.Item>

                          <Form.Item
                            name="plan"
                            label="Plan"
                            rules={[
                              {
                                message: "Please select a Plan!",
                              },
                            ]}
                          >
                            <Radio.Group
                              buttonStyle="solid"
                              onChange={updatePlanMemberSize}
                            >
                              <Radio.Button value="micro" defaultChecked={true}>
                                Micro
                              </Radio.Button>
                              <Radio.Button value="small">Small</Radio.Button>
                              <Tooltip title="contact sales">
                                <Radio.Button value="medium" disabled={true}>
                                  Medium
                                </Radio.Button>
                              </Tooltip>
                              <Tooltip title="contact sales">
                                <Radio.Button value="big" disabled={true}>
                                  Big
                                </Radio.Button>
                              </Tooltip>
                              <Tooltip title="contact sales">
                                <Radio.Button value="mega" disabled={true}>
                                  Mega
                                </Radio.Button>
                              </Tooltip>
                            </Radio.Group>
                          </Form.Item>
                          {planMemberSize && (
                            <span style={{ marginBottom: "0.2rem" }}>
                              For teams with upto {planMemberSize} members
                            </span>
                          )}

                          <Form.Item
                            style={{
                              marginTop: planMemberSize ? "0.4rem" : "0",
                            }}
                          >
                            <Button
                              type="primary"
                              htmlType="submit"
                              className="create-team-form-button"
                            >
                              Create
                            </Button>
                          </Form.Item>
                        </Form>
                      </div>
                    </Spin>
                  </div>
                )}
              </div>
            ) : (
              <Spin spinning={!(team && team.members.length)}>
                <div className="site-layout-content">
                  {showOverviewView && (
                    <div className="overview-view-container">
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

                          <AddMemberCard
                            onClick={() => setAddMemberDrawerVisible(true)}
                          />
                          <Drawer
                            title="Add Member"
                            placement="right"
                            closable={false}
                            onClose={() => setAddMemberDrawerVisible(false)}
                            visible={addMemberDrawerVisible}
                            key="right"
                          >
                            <Spin spinning={memberAdding}>
                              <Form
                                name="normal_add_member"
                                className="add-member-form"
                                onFinish={addMember}
                                onFinishFailed={console.eror}
                              >
                                <Form.Item
                                  name="email"
                                  label="E-mail"
                                  rules={[
                                    {
                                      type: "email",
                                      message: "The input is not valid E-mail!",
                                    },
                                    {
                                      required: true,
                                      message: "Please input your E-mail!",
                                    },
                                  ]}
                                >
                                  <Input />
                                </Form.Item>

                                <Form.Item>
                                  <Button
                                    type="primary"
                                    htmlType="submit"
                                    className="add-member-form-button"
                                  >
                                    Register
                                  </Button>
                                </Form.Item>
                              </Form>
                            </Spin>
                          </Drawer>
                        </Row>
                      </div>
                    </div>
                  )}

                  {showMyTeamView && (
                    <div className="my-team-view-container"></div>
                  )}

                  {showBillingView && (
                    <div className="billing-view-container"></div>
                  )}
                </div>
              </Spin>
            )}
          </div>
        ) : (
          <div className="auth-form-container">
            {showLoginForm && (
              <Spin spinning={loggingIn}>
                <div className="login-form-container">
                  <div className="login-form-title-container">
                    <span className="login-form-title">Login</span>
                  </div>
                  <Form
                    name="normal_login"
                    className="login-form"
                    initialValues={{
                      remember: true,
                    }}
                    onFinish={logInUser}
                    onFinishFailed={console.error}
                  >
                    <Form.Item
                      name="email"
                      rules={[
                        {
                          required: true,
                          message: "Please input your Email!",
                        },
                      ]}
                    >
                      <Input
                        prefix={
                          <MailOutlined className="site-form-item-icon" />
                        }
                        placeholder="Email"
                      />
                    </Form.Item>

                    <Form.Item
                      name="password"
                      rules={[
                        {
                          required: true,
                          message: "Please input your Password!",
                        },
                      ]}
                    >
                      <Input
                        prefix={
                          <LockOutlined className="site-form-item-icon" />
                        }
                        type="password"
                        placeholder="Password"
                      />
                    </Form.Item>

                    <Form.Item>
                      <Form.Item
                        name="remember"
                        valuePropName="checked"
                        noStyle
                      >
                        <Checkbox>Remember me</Checkbox>
                      </Form.Item>

                      <span
                        className="login-form-forgot look-like-a-tag"
                        onClick={() => {
                          setShowLoginForm(false);
                          setShowRegisterForm(false);
                          setShowPasswordResetForm(true);
                        }}
                      >
                        Forgot password
                      </span>
                    </Form.Item>

                    <Form.Item>
                      <Button
                        type="primary"
                        htmlType="submit"
                        className="login-form-button"
                      >
                        Login
                      </Button>
                      Or{" "}
                      <span
                        className="look-like-a-tag"
                        onClick={() => {
                          setShowPasswordResetForm(false);
                          setShowLoginForm(false);
                          setShowRegisterForm(true);
                        }}
                      >
                        register now!
                      </span>
                    </Form.Item>
                  </Form>
                </div>
              </Spin>
            )}

            {showPasswordResetForm && (
              <div className="password-reset-form-container">
                <div className="password-reset-form-title-container">
                  <span className="password-reset-form-title">
                    Reset Password
                  </span>
                </div>
                <Form
                  name="normal_password_reset"
                  className="password-reset-form"
                  initialValues={{
                    remember: true,
                  }}
                  onFinish={requestResetPasswordEmail}
                  onFinishFailed={console.error}
                >
                  <Form.Item
                    name="email"
                    rules={[
                      {
                        required: true,
                        message: "Please input your Email!",
                      },
                    ]}
                  >
                    <Input
                      prefix={<MailOutlined className="site-form-item-icon" />}
                      placeholder="Email"
                    />
                  </Form.Item>

                  <Form.Item>
                    <Button
                      type="primary"
                      htmlType="submit"
                      className="password-reset-form-button"
                    >
                      Submit
                    </Button>
                    Or{" "}
                    <span
                      className="look-like-a-tag"
                      onClick={() => {
                        setShowPasswordResetForm(false);
                        setShowRegisterForm(false);
                        setShowLoginForm(true);
                      }}
                    >
                      login now!
                    </span>
                  </Form.Item>
                </Form>
              </div>
            )}

            {showRegisterForm && (
              <Spin spinning={registering}>
                <div className="register-form-container">
                  <div className="register-form-title-container">
                    <span className="register-form-title">Register</span>
                  </div>
                  <Form
                    name="normal_register"
                    className="register-form"
                    initialValues={{
                      remember: true,
                    }}
                    onFinish={registerUser}
                    onFinishFailed={console.eror}
                  >
                    <Form.Item
                      name="email"
                      rules={[
                        {
                          required: true,
                          message: "Please provide your Email!",
                        },
                      ]}
                    >
                      <Input
                        prefix={
                          <MailOutlined className="site-form-item-icon" />
                        }
                        placeholder="Email"
                      />
                    </Form.Item>

                    <Form.Item
                      name="password"
                      rules={[
                        {
                          required: true,
                          message: "Please set a Password!",
                        },
                      ]}
                    >
                      <Input
                        prefix={
                          <LockOutlined className="site-form-item-icon" />
                        }
                        type="password"
                        placeholder="Password"
                      />
                    </Form.Item>

                    <Divider orientation="left" plain>
                      Tell us about yourself
                    </Divider>

                    <Form.Item
                      name="name"
                      rules={[
                        {
                          required: true,
                          message: "Please input your Name!",
                        },
                      ]}
                    >
                      <Input
                        // prefix={<MailOutlined className="site-form-item-icon" />}
                        placeholder="Name"
                      />
                    </Form.Item>

                    <Form.Item
                      name="organization"
                      rules={[
                        {
                          required: false,
                          message: "Please input your Organization!",
                        },
                      ]}
                    >
                      <Input
                        // prefix={<LockOutlined className="site-form-item-icon" />}
                        placeholder="Organization"
                      />
                    </Form.Item>

                    <Form.Item
                      name="role"
                      rules={[
                        {
                          required: false,
                          message: "Please input your Role!",
                        },
                      ]}
                    >
                      <Input
                        // prefix={<LockOutlined className="site-form-item-icon" />}
                        placeholder="Role"
                      />
                    </Form.Item>

                    <Form.Item>
                      <Form.Item
                        name="remember"
                        valuePropName="checked"
                        noStyle
                      >
                        <Checkbox>Remember me</Checkbox>
                      </Form.Item>
                    </Form.Item>

                    <Form.Item>
                      <Button
                        type="primary"
                        htmlType="submit"
                        className="register-form-button"
                      >
                        Register
                      </Button>
                      Or{" "}
                      <span
                        className="look-like-a-tag"
                        onClick={() => {
                          setShowPasswordResetForm(false);
                          setShowRegisterForm(false);
                          setShowLoginForm(true);
                        }}
                      >
                        login now!
                      </span>
                    </Form.Item>
                  </Form>
                </div>
              </Spin>
            )}
          </div>
        )}
      </Content>

      <Footer style={{ textAlign: "center" }}>
        StatusVariable ©2021 | Developed by @dspsolves
      </Footer>
    </Layout>
  );
}

export default Home;
