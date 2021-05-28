let
  sources  = import ./nix/sources.nix;
  pkgs     = import sources.nixpkgs  {};
  unstable = import sources.unstable {};
  # https://github.com/NixOS/nixpkgs/issues/53820#issuecomment-617973476
  yarn = unstable.yarn.override { nodejs = null; };
in

pkgs.mkShell {
  buildInputs = [
    yarn
    unstable.nodejs-15_x
    unstable.niv
  ];

  shellHook = ''
    ${yarn}/bin/yarn install
  '';
}
