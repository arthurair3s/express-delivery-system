using System;

namespace Features.ProcessamentoRotas.Exceptions
{
    public class RouteNotFoundException : Exception
    {
        public RouteNotFoundException(string message) : base(message) { }
    }

    public class ProviderUnavailableException : Exception
    {
        public ProviderUnavailableException(string message) : base(message) { }
    }
}
