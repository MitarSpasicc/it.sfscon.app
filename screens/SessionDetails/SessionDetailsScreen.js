import { useState, useEffect, useMemo } from "react";
import {
  View,
  TouchableOpacity,
  ScrollView,
  Linking,
  Text,
} from "react-native";
import { getTheme } from "../../tools/getTheme";
import getStyles from "./sessionDetailsScreenStyles";
import { MaterialIcons, Feather, Ionicons } from "@expo/vector-icons";
import moment from "moment";
import { useSelector, useDispatch } from "react-redux";
import { getData } from "../../tools/sessions";
import WebViewComponent from "../../components/WebViewComponent";
import RatingsComponent from "../../components/RateModal/RateModal";
// import Text from "../../components/TextComponent";
import {
  getMySchedules,
  setMySchedule,
  toggleTabBarVisibility,
} from "../../store/actions/AppActions";
import { useShare } from "../../tools/useShare";
import StarRating from "../../components/RatingStars/RatingStars";
import RoadSVG from "../../assets/road.svg";
import Speaker from "../../components/Speaker/Speaker";
import { decodeHTML, parseTextWithStyles } from "../../tools/validations";

export default SessionDetailsScreen = ({ route, navigation }) => {
  const theme = getTheme();
  const dispatch = useDispatch();
  const styles = useMemo(() => getStyles(theme), [theme]);

  const speakers = useSelector(
    (state) => state.app.db?.conference?.db?.lecturers
  );
  const ratings = useSelector((state) => state.app.db?.ratings);
  const mySchedules = useSelector((state) => state.app.db?.bookmarks);
  const scheduleToggled = useSelector((state) => state.app.scheduleToggled);

  const { session = {}, track = {} } = route?.params || {};
  const { rates_by_session = {}, my_rate_by_session = {} } = ratings || {};

  const handleUrl = async () => {
    try {
      if (session?.stream_link) {
        const splitStreamLink = session?.stream_link.split("- ")[1];
        const canOpen = await Linking.canOpenURL(splitStreamLink);

        if (!canOpen) throw new Error("Unable to open link");

        await Linking.openURL(splitStreamLink);
      }
    } catch (error) {
      console.log("ERR", error);
    }
  };

  const formatEndTime = () => {
    return moment(session?.start)
      .add(session?.duration, "seconds")
      .format("HH:mm");
  };

  const [showModal, setShowModal] = useState(false);
  const [rating, setRating] = useState([0, 0]);

  const { share } = useShare();

  const parseTextWithStyles = (text) => {
    const components = [];

    const parsedText = text
      .replace(/<Text style={styles.bold}>/g, "__BOLD_START__")
      .replace(/<\/Text>/g, "__BOLD_END__")
      .replace(/<Text style={styles.italic}>/g, "__ITALIC_START__")
      .replace(/<a href=/g, "__LINK_START__")
      .replace(/<\/a>/g, "__LINK_END__");

    const splitText = parsedText.split(
      /(__BOLD_START__|__BOLD_END__|__ITALIC_START__|__ITALIC_END__|__LINK_START__|__LINK_END__)/
    );

    let isBold = false;
    let isItalic = false;
    let isLink = false;
    let linkUrl = "";

    splitText.forEach((part, index) => {
      if (part === "__BOLD_START__") {
        isBold = true;
      } else if (part === "__BOLD_END__") {
        isBold = false;
      } else if (part === "__ITALIC_START__") {
        isItalic = true;
      } else if (part === "__ITALIC_END__") {
        isItalic = false;
      } else if (part === "__LINK_START__") {
        isLink = true;
        linkUrl = splitText[index + 1];
      } else if (part === "__LINK_END__") {
        isLink = false;
      } else if (isBold) {
        components.push(
          <Text key={index} style={styles.bold}>
            {part}
          </Text>
        );
      } else if (isItalic) {
        components.push(
          <Text key={index} style={styles.italic}>
            {part}
          </Text>
        );
      } else if (isLink) {
        components.push(
          <Text
            key={index}
            style={styles.link}
            onPress={() => Linking.openURL(linkUrl)}
          >
            {linkUrl}
          </Text>
        );
        isLink = false;
      } else {
        components.push(<Text key={index}>{part}</Text>);
      }
    });

    return components;
  };

  const findSession = () => {
    if (session?.id in rates_by_session) {
      setRating(rates_by_session[session?.id]);
    }
  };

  const onShare = async (link) => {
    await share({ url: link, title: "SFSCon", message: "SFSCon" });
  };

  const handleGoBack = () => {
    dispatch(toggleTabBarVisibility("show"));
    const lastVisited = route?.params?.lastVisited;
    lastVisited
      ? navigation.navigate(lastVisited, { session, track })
      : navigation.goBack();
  };

  useEffect(() => {
    findSession();
  }, [session.id, rates_by_session]);

  useEffect(() => {
    dispatch(getMySchedules());
  }, [scheduleToggled]);

  return (
    <>
      <RatingsComponent
        session={session.id}
        showModal={showModal}
        setShowModal={setShowModal}
      />
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.goBackBtn} onPress={handleGoBack}>
            <MaterialIcons
              name="arrow-back-ios"
              size={24}
              color={theme.textMedium}
              style={styles.goBackIcon}
            />
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            <Text numberOfLines={2} style={styles.title}>
              {decodeHTML(session?.title)}
            </Text>
          </View>

          {session?.bookmarkable ? (
            <TouchableOpacity
              onPress={() => dispatch(setMySchedule(session.id))}
              style={styles.bookmarkBtn}
            >
              {mySchedules.indexOf(session.id) !== -1 ? (
                <Ionicons
                  name="bookmark"
                  size={18}
                  style={styles.bookmarkIcon}
                />
              ) : (
                <Ionicons
                  name="bookmark-outline"
                  size={18}
                  style={styles.bookmarkIconSelected}
                />
              )}
            </TouchableOpacity>
          ) : null}
        </View>
        <ScrollView bounces={false} style={styles.scrollView}>
          {session?.rateable ? (
            <TouchableOpacity
              onPress={() => setShowModal(true)}
              style={styles.reviewContainer}
            >
              <StarRating rating={rating[0]} numberOfReviews={rating[1]} />
            </TouchableOpacity>
          ) : null}

          <View style={styles.eventDetailsContainer}>
            <View style={styles.eventDetail}>
              <Feather name="calendar" size={18} style={styles.eventIcon} />
              <Text numberOfLines={1} style={styles.eventText}>
                {moment(session?.date).format("DD MMM YYYY")}
              </Text>
            </View>
            <View style={styles.eventDetail}>
              <Feather name="clock" size={18} style={styles.eventIcon} />
              <Text numberOfLines={1} style={styles.eventText}>
                {`${moment(session.start).format(
                  "HH:mm"
                )} - ${formatEndTime()}`}
              </Text>
            </View>

            <View style={styles.eventDetail}>
              <View style={styles.roadSvgHolder}>
                <RoadSVG />
              </View>
              <Text numberOfLines={1} style={styles.eventText}>
                {track?.name}
              </Text>
            </View>
          </View>

          <View style={styles.main}>
            {session?.stream_link ? (
              <View style={styles.streamContainer}>
                <Text
                  bold
                  style={{ ...styles.mainTitle, ...styles.streamTitle }}
                >
                  Location
                </Text>

                <TouchableOpacity style={styles.streamBtn} onPress={handleUrl}>
                  <Text numberOfLines={1} style={styles.streamLink}>
                    {session?.stream_link}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <></>
            )}

            {/* <View style={styles.descriptionContainer}>
              <Text bold style={styles.mainTitle}>
                Description
              </Text>
              {session.description ? (
                <WebViewComponent source={session?.description} margin={20} />
              ) : (
                <Text>No description</Text>
              )}
            </View> */}

            <View style={styles.descriptionContainer}>
              <Text bold style={styles.mainTitle}>
                Description
              </Text>
              {session.description ? (
                <Text style={styles.description}>
                  {parseTextWithStyles(decodeHTML(session.description))}
                </Text>
              ) : (
                <Text>No description</Text>
              )}
            </View>

            {session?.id_lecturers.length ? (
              <View style={styles.speakersContainer}>
                <Text
                  bold
                  style={{
                    ...styles.mainTitle,
                    ...styles.speakersTitle,
                  }}
                >
                  Speakers
                </Text>

                {session?.id_lecturers.map((s, idx) => {
                  const speaker = getData(speakers, s);
                  return speaker ? (
                    <TouchableOpacity
                      onPress={() =>
                        navigation.navigate("AuthorDetails", {
                          author: speaker,
                        })
                      }
                      key={idx}
                      style={styles.speaker}
                    >
                      <Speaker speaker={speaker} key={idx} />
                    </TouchableOpacity>
                  ) : null;
                })}
              </View>
            ) : null}
            <View style={styles.ratingsFooter}>
              <Text bold style={styles.footerHeading}>
                What do you think about this talk?
              </Text>
              <Text style={styles.footerSecondaryHeading}>
                We are interested in hearing your feedback
              </Text>
              <View style={styles.footerTop}>
                {session?.rateable ? (
                  <TouchableOpacity
                    style={{ ...styles.actionButton, ...styles.rateBtn }}
                    onPress={() => {
                      setShowModal(true);
                    }}
                  >
                    <Text bold style={styles.btnLabel}>
                      Rate the talk
                    </Text>
                  </TouchableOpacity>
                ) : null}
                {session.can_share ? (
                  <TouchableOpacity
                    onPress={() =>
                      onShare(session?.share_link || "https://www.sfscon.it/")
                    }
                    style={{ ...styles.actionButton, ...styles.shareBtn }}
                  >
                    <Text bold style={styles.btnLabel}>
                      Share the talk
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    </>
  );
};
