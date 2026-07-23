import { Polar } from "@polar-sh/sdk";

type PolarServer = "sandbox" | "production";

function getOptionalEnv(name: string): string | undefined {
  return process.env[name];
}

export function getPolarAccessToken(): string | undefined {
  return getOptionalEnv("POLAR_ACCESS_TOKEN");
}

export function getPolarProductId(): string | undefined {
  return getOptionalEnv("POLAR_PRODUCT_ID");
}

export function getPolarCreditsMeterId(): string | undefined {
  return getOptionalEnv("POLAR_CREDITS_METER_ID");
}

export function getPolarServer(): PolarServer {
  const server = process.env.POLAR_SERVER;
  if (!server) {
    return "sandbox";
  }

  if (server !== "sandbox" && server !== "production") {
    throw new Error("POLAR_SERVER must be either 'sandbox' or 'production'");
  }

  return server;
}

// Lazy initialization of Polar client
let _polar: Polar | null = null;

function getPolarClient(): Polar {
  if (!_polar) {
    const accessToken = getPolarAccessToken();
    if (!accessToken) {
      throw new Error("POLAR_ACCESS_TOKEN is required for billing operations");
    }
    _polar = new Polar({
      accessToken,
      server: getPolarServer(),
    });
  }
  return _polar;
}

function hasStatusCode(error: unknown): error is { statusCode: number } {
  return (
    typeof error === "object" &&
    error !== null &&
    "statusCode" in error &&
    typeof error.statusCode === "number"
  );
}

type CreateCheckoutUrlParams = {
  customerExternalId: string;
  requestUrl: string;
};

export async function createCheckoutUrl({
  customerExternalId,
  requestUrl,
}: CreateCheckoutUrlParams) {
  const polar = getPolarClient();
  const productId = getPolarProductId();
  if (!productId) {
    throw new Error("POLAR_PRODUCT_ID is required for checkout");
  }

  const result = await polar.checkouts.create({
    products: [productId],
    successUrl: new URL("/billing/success", requestUrl).toString(),
    externalCustomerId: customerExternalId,
    metadata: { source: "mycode-cli" },
  });

  return result.url;
};

export async function createCustomerPortalUrl({
  customerExternalId,
  requestUrl,
}: CreateCheckoutUrlParams) {
  const polar = getPolarClient();

  const result = await polar.customerSessions.create({
    externalCustomerId: customerExternalId,
    returnUrl: new URL("/billing/success", requestUrl).toString(),
  });

  return result.customerPortalUrl;
};

export async function getAvailableCreditsBalance(customerExternalId: string) {
  const polar = getPolarClient();
  const meterId = getPolarCreditsMeterId();
  if (!meterId) {
    return 0; // No meter configured, return 0 balance
  }

  try {
    const customerState = await polar.customers.getStateExternal({
      externalId: customerExternalId,
    });

    const matchingMeters = customerState.activeMeters.filter(
      (meter) => meter.meterId === meterId,
    );

    if (matchingMeters.length > 1) {
      throw new Error("Expected exactly one matching Polar credits meter");
    }

    const creditsMeter = matchingMeters[0];
    return creditsMeter?.balance ?? 0;
  } catch (error) {
    if (hasStatusCode(error) && error.statusCode === 404) {
      return 0;
    }

    throw error;
  }
};

type IngestAiUsageParams = {
  externalCustomerId: string;
  eventId: string;
  credits: number;
};

export async function ingestAiUsage({
  externalCustomerId,
  eventId,
  credits
}: IngestAiUsageParams) {
  if (credits <= 0) {
    return;
  }

  const polar = getPolarClient();

  await polar.events.ingest({
    events: [
      {
        name: "mycode_usage",
        externalId: eventId,
        externalCustomerId,
        metadata: { credits },
      },
    ],
  });
};
