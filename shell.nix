let
  sources  = import ./nix/sources.nix;
  pkgs     = import sources.nixpkgs  {};
  unstable = import sources.unstable {};
in

pkgs.mkShell {
  buildInputs = [
    pkgs.just
    unstable.yarn
    unstable.nodejs-14_x
  ];
}
