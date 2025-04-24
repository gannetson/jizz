import {Box, Button, Flex, Heading, Link, ListItem, Spinner, Text, UnorderedList} from "@chakra-ui/react";
import Page from "./layout/page";
import SelectCountry from "../components/select-country";
import SelectLevel from "../components/select-level";
import AppContext from "../core/app-context";
import {useContext, useState} from "react";
import {formatDistanceToNow} from "date-fns";
import {GiHummingbird} from "react-icons/all";
import SelectLanguage from "../components/select-language"

export const PrivacyPage = () => {


  return (
    <Page>
      <Page.Header>
        <Heading textColor={'gray.800'} size={'lg'} m={0} noOfLines={1}>
          Privacy Policy for Birdr - Bird Identification App
        </Heading>
      </Page.Header>
      <Page.Body>
        <Heading size={'sm'}>Introduction</Heading>
        <Text>
          Welcome to Birdr - Bird Identification App ("Birdr", "we", "our", "us"). We are committed to protecting your
          privacy and ensuring that your personal data is handled securely. This Privacy Policy explains how we collect,
          use, disclose, and safeguard your information when you use our mobile application and services.
        </Text>
        <Text>
          By using Birdr, you agree to the collection and use of information in accordance with this Privacy Policy.
        </Text>

        <Heading size={'sm'}>Information We Collect</Heading>
        <Text>
          <strong>1. Personal Data</strong>
        </Text>
        <UnorderedList>
          <ListItem>Name (if provided by you)</ListItem>
          <ListItem>Email address (if you sign up for an account)</ListItem>
          <ListItem>Any comments, feedback or flagged media you submit</ListItem>
        </UnorderedList>
        <Text>
          <strong>2. Non-Personal Data</strong>
        </Text>
        <UnorderedList>
          <ListItem>Device type and operating system</ListItem>
          <ListItem>App usage statistics (such as features used and session length)</ListItem>
          <ListItem>Anonymous analytics data (to improve our services)</ListItem>
        </UnorderedList>

        <Heading size={'sm'}>How We Use Your Information</Heading>
        <UnorderedList>
          <ListItem>To personalize user experience</ListItem>
          <ListItem>To enhance app functionality and troubleshoot issues</ListItem>
          <ListItem>To send occasional updates or newsletters (only if you opt in)</ListItem>
          <ListItem>To comply with legal obligations</ListItem>
        </UnorderedList>

        <Heading size={'sm'}>How We Share Your Information</Heading>
        <Text>
          We do not sell or rent your personal data to third parties.
        </Text>

        <Heading size={'sm'}>Data Storage and Security</Heading>
        <Text>
          We implement industry-standard security measures to protect your data. However, no method of transmission over
          the internet is completely secure. We encourage users to take necessary precautions when sharing personal
          information.
        </Text>

        <Heading size={'sm'}>Your Rights and Choices</Heading>
        <Text>
          You have the right to:
        </Text>
        <UnorderedList>
          <ListItem>Access the personal data we hold about you</ListItem>
          <ListItem>Request correction or deletion of your data</ListItem>
          <ListItem>Withdraw consent for data processing</ListItem>
          <ListItem>Opt out of communications</ListItem>
        </UnorderedList>
        <Text>
          To exercise these rights, please contact us at <Link color={'orange.500'} target={'_blank'}
                                                               href={'mailto:info@goedloek.nl'}>info@goedloek.nl</Link>.
        </Text>

        <Heading size={'sm'}>Contact Us</Heading>
        <Text>
          If you have any questions about this Privacy Policy, you can contact us at:
        </Text>
        <Text>
          <Link color={'orange.500'} target={'_blank'} href={'mailto:info@goedloek.nl'}>info@goedloek.nl</Link>.
        </Text>

        <Text>
          <em>Last Updated: March 1, 2025</em>
        </Text>
      </Page.Body>
    </Page>


  )
};
