// Enhanced test utilities with service injection
import * as React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { ChakraProvider, defaultSystem } from '@chakra-ui/react';
import { IntlProvider } from 'react-intl';
import { BrowserRouter } from 'react-router-dom';
import { Services, createMockServices } from '../api/services';
import { WebSocketService, MockWebSocketService } from '../services/websocket.service';
import { ServicesContext } from '../contexts/services.context';
import { WebSocketServiceContext } from '../contexts/websocket.context';

interface TestProvidersProps {
  children?: React.ReactNode;
  services?: Services;
  websocketService?: WebSocketService;
  locale?: string;
  messages?: Record<string, Record<string, string>>;
}

const TestProviders: React.FC<TestProvidersProps> = ({
  children,
  services = createMockServices(),
  websocketService = new MockWebSocketService(),
  locale = 'en',
  messages = {},
}) => {
  return (
    <ChakraProvider value={defaultSystem}>
      <IntlProvider locale={locale} messages={messages[locale] || {}}>
        <BrowserRouter>
          <ServicesContext.Provider value={services}>
            <WebSocketServiceContext.Provider value={websocketService}>
              {children}
            </WebSocketServiceContext.Provider>
          </ServicesContext.Provider>
        </BrowserRouter>
      </IntlProvider>
    </ChakraProvider>
  );
};

interface CustomRenderOptions extends RenderOptions {
  services?: Services;
  websocketService?: WebSocketService;
  locale?: string;
  messages?: Record<string, Record<string, string>>;
}

const customRender = (
  ui: React.ReactElement,
  options: CustomRenderOptions = {}
) => {
  const { services, websocketService, locale, messages, ...renderOptions } = options;
  return render(ui, {
    wrapper: (props) => (
      <TestProviders
        services={services}
        websocketService={websocketService}
        locale={locale}
        messages={messages}
        {...props}
      />
    ),
    ...renderOptions,
  });
};

export * from '@testing-library/react';
export { customRender as render };
export { createMockServices } from '../api/services';
export { MockWebSocketService } from '../services/websocket.service';

