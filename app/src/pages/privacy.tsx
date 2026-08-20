import { FormattedMessage } from "react-intl";
import { CmsPage } from "./cms-page";

export const PrivacyPage = () => (
  <CmsPage
    slug="privacy"
    showBackToHelp
    headerTitle={<FormattedMessage id="privacy" defaultMessage="Privacy" />}
  />
);
